import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { IssueCodeCommand } from "@modules/oauth/application/command/issue-code.command";
import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import type { IssueCodeResult } from "@modules/oauth/application/handler/issue-code.command.handler";
import type { RedeemCodeResult } from "@modules/oauth/application/handler/redeem-code.command.handler";
import { ValidateAuthorizationQuery } from "@modules/oauth/application/query/validate-authorization.query";
import type { Requester } from "@modules/oauth/application/requester.type";
import { AuthorizeCodeRequest } from "@modules/oauth/presentation/dto/v1/authorize-code.request";
import { AuthorizeQuery } from "@modules/oauth/presentation/dto/v1/authorize.query";
import { AuthorizeResponse } from "@modules/oauth/presentation/dto/v1/authorize.response";
import { TokenRequest } from "@modules/oauth/presentation/dto/v1/token.request";
import { TokenResponse } from "@modules/oauth/presentation/dto/v1/token.response";
import {
  ApiAuthorizationCodeAlreadyUsedResponse,
  ApiAuthorizationCodeExpiredResponse,
  ApiAuthorizationScopesNotAllowedResponse,
  ApiClientInactiveResponse,
  ApiInvalidAuthorizationCodeResponse,
  ApiInvalidClientCredentialsResponse,
  ApiRedirectUriNotAllowedResponse,
} from "@modules/oauth/presentation/exception-response.decorator";
import {
  GRANT_TYPE_AUTHORIZATION_CODE,
  OAuthErrorCode,
  WEB_LOGIN_PAGE_PATH,
} from "@modules/oauth/oauth.constants";

import { ApiUnexpectedErrorResponse } from "@core/presentation/exception-response.decorator";
import type { AuthenticatedUser } from "@core/shared/presentation/auth/authenticated-user.type";
import { CurrentUser } from "@core/shared/presentation/auth/current-user.decorator";
import { ApiAuthenticatedResponse } from "@core/shared/presentation/auth/exception-response.decorator";
import { Public } from "@core/shared/presentation/auth/public.decorator";

import {
  AuthorizationScopesNotAllowedException,
} from "@modules/oauth/domain/exception/authorization-scopes-not-allowed.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";

const toRequester = (authenticatedUser: AuthenticatedUser): Requester => ({
  userId: authenticatedUser.userId,
  roles: authenticatedUser.roles,
});

const SCOPE_SEPARATOR = " ";
const STATE_MAX_LENGTH = 255;

@ApiTags("oauth")
@Controller({ path: "oauth", version: "1" })
export class OAuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Get("authorize")
  @ApiOperation({
    description:
      "Front channel of the authorization code flow: validates the authorization request and redirects the browser " +
      "to the IdP login page, or back to the client with an OAuth error",
  })
  @ApiResponse({ status: HttpStatus.FOUND, description: "Redirect to the IdP login page or to the client callback" })
  @ApiRedirectUriNotAllowedResponse()
  @ApiUnexpectedErrorResponse()
  async authorizeRedirect(@Query() query: AuthorizeQuery, @Res() res: Response): Promise<void> {
    try {
      await this.queryBus.execute(
        new ValidateAuthorizationQuery(query.client_id, query.redirect_uri, query.scope.split(SCOPE_SEPARATOR))
      );
    } catch (error) {
      if (error instanceof AuthorizationScopesNotAllowedException) {
        res.redirect(HttpStatus.FOUND, this.buildErrorRedirectUrl(query, OAuthErrorCode.InvalidScope));
        return;
      }

      if (error instanceof ClientInactiveException) {
        res.redirect(HttpStatus.FOUND, this.buildErrorRedirectUrl(query, OAuthErrorCode.UnauthorizedClient));
        return;
      }

      throw error;
    }

    res.redirect(HttpStatus.FOUND, this.buildLoginUrl(query));
  }

  @Post("authorize")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    description:
      "Issues a one-time authorization code for the authenticated resource owner, " +
      "called by the IdP web client after the consent screen is approved",
  })
  @ApiAuthenticatedResponse()
  @ApiOkResponse({ type: AuthorizeResponse, description: "Authorization code issued" })
  @ApiRedirectUriNotAllowedResponse()
  @ApiAuthorizationScopesNotAllowedResponse()
  @ApiClientInactiveResponse()
  @ApiUnexpectedErrorResponse()
  async authorize(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() request: AuthorizeCodeRequest
  ): Promise<AuthorizeResponse> {
    const command = new IssueCodeCommand(
      toRequester(currentUser),
      request.clientId,
      request.redirectUri,
      request.scope.split(SCOPE_SEPARATOR)
    );
    const result = await this.commandBus.execute<IssueCodeCommand, IssueCodeResult>(command);

    return new AuthorizeResponse(request.redirectUri, result.code, request.state, result.expiresAt);
  }

  @Public()
  @Post("token")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    description: "Exchanges the authorization code for an id token, requires client secret",
  })
  @ApiOkResponse({ type: TokenResponse, description: "Authorization code redeemed" })
  @ApiInvalidAuthorizationCodeResponse()
  @ApiInvalidClientCredentialsResponse()
  @ApiAuthorizationCodeExpiredResponse()
  @ApiAuthorizationCodeAlreadyUsedResponse()
  @ApiClientInactiveResponse()
  @ApiUnexpectedErrorResponse()
  async token(@Body() request: TokenRequest): Promise<TokenResponse> {
    const command = new RedeemCodeCommand(request.clientId, request.clientSecret, request.code, request.redirectUri);
    const result = await this.commandBus.execute<RedeemCodeCommand, RedeemCodeResult>(command);

    return new TokenResponse(result.idToken, result.expiresIn, result.clientId, result.userId, result.scopes);
  }

  private buildLoginUrl(query: AuthorizeQuery): string {
    const appWebUrl = this.configService.getOrThrow<string>("APP_WEB_URL");
    const loginUrl = new URL(WEB_LOGIN_PAGE_PATH, appWebUrl);

    loginUrl.searchParams.set("response_type", query.response_type);
    loginUrl.searchParams.set("client_id", query.client_id);
    loginUrl.searchParams.set("redirect_uri", query.redirect_uri);
    loginUrl.searchParams.set("scope", query.scope);


    if (query.state !== undefined) {
      loginUrl.searchParams.set("state", query.state);
    }

    return loginUrl.toString();
  }

  private buildErrorRedirectUrl(query: AuthorizeQuery, errorCode: string): string {
    const callbackUrl = new URL(query.redirect_uri);

    callbackUrl.searchParams.set("error", errorCode);

    if (query.state !== undefined && query.state.length <= STATE_MAX_LENGTH) {
      callbackUrl.searchParams.set("state", query.state);
    }

    return callbackUrl.toString();
  }
}
