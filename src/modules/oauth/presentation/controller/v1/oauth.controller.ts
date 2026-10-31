import { Body, Controller, Get, Header, HttpCode, HttpStatus, Logger, Post, Query, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import { CurrentUser } from "@shared/auth/decorator/current-user.decorator";
import { Public } from "@shared/auth/decorator/public.decorator";
import { DomainException } from "@shared/exception/base/domain.exception";
import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import { validationExceptionFactory } from "@shared/exception/factory/validation-exception.factory";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import type { Response } from "express";

import { IssueCodeCommand } from "@modules/oauth/application/command/issue-code.command";
import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import type { IssueCodeResult } from "@modules/oauth/application/handler/issue-code.command.handler";
import type { RedeemCodeResult } from "@modules/oauth/application/handler/redeem-code.command.handler";
import type { IdTokenPublicKey } from "@modules/oauth/application/port/id-token-public-key.type";
import { GetJwksQuery } from "@modules/oauth/application/query/get-jwks.query";
import { ValidateAuthorizationQuery } from "@modules/oauth/application/query/validate-authorization.query";
import { ValidateClientRedirectQuery } from "@modules/oauth/application/query/validate-client-redirect.query";
import { OAuthTokenExchangeService } from "@modules/oauth/application/service/oauth-token-exchange.service";
import type { Requester } from "@modules/oauth/application/type/requester.type";
import { ClientId } from "@modules/oauth/oauth.ids";
import { WEB_CONSENT_PAGE_PATH } from "@modules/oauth/presentation/constants/oauth-consent.constants";
import { OAuthErrorCode } from "@modules/oauth/presentation/constants/oauth-error.constants";
import { GRANT_TYPE_REFRESH_TOKEN } from "@modules/oauth/presentation/constants/oauth-grant-type.constants";
import { AuthorizeCodeRequest } from "@modules/oauth/presentation/dto/v1/authorize-code.request";
import { AuthorizeQuery } from "@modules/oauth/presentation/dto/v1/authorize.query";
import { AuthorizeResponse } from "@modules/oauth/presentation/dto/v1/authorize.response";
import { JwksResponse } from "@modules/oauth/presentation/dto/v1/jwks.response";
import { TokenRequest } from "@modules/oauth/presentation/dto/v1/token.request";
import { TokenResponse } from "@modules/oauth/presentation/dto/v1/token.response";
import { mapOAuthRedirectErrorCode } from "@modules/oauth/presentation/mapper/oauth-redirect-error.mapper";

const toRequester = (authenticatedUser: AuthenticatedUser): Requester => ({
  userId: authenticatedUser.userId,
  roles: authenticatedUser.roles,
});
const SCOPE_SEPARATOR = " ";
const STATE_MAX_LENGTH = 255;

@Controller({ path: "oauth", version: "1" })
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly configService: ConfigService,
    private readonly tokens: OAuthTokenExchangeService
  ) {}

  @Public()
  @Get("jwks")
  async jwks(): Promise<JwksResponse> {
    const keys = await this.queryBus.execute<GetJwksQuery, IdTokenPublicKey[]>(new GetJwksQuery());

    return new JwksResponse(keys);
  }

  @Public()
  @Get("authorize")
  async authorizeRedirect(
    @Query()
    rawQuery: Record<string, unknown>,
    @Res()
    res: Response
  ): Promise<void> {
    const query = plainToInstance(AuthorizeQuery, rawQuery);
    const errors = validateSync(query, { whitelist: true });
    const redirectErrors = errors.filter(
      (error) => error.property === "client_id" || error.property === "redirect_uri"
    );

    if (redirectErrors.length > 0) {
      throw validationExceptionFactory(redirectErrors);
    }

    await this.queryBus.execute(new ValidateClientRedirectQuery(query.client_id, query.redirect_uri));

    if (errors.length > 0) {
      const unsupportedResponseType = typeof query.response_type === "string" && query.response_type !== "code";
      const errorCode = unsupportedResponseType
        ? OAuthErrorCode.UnsupportedResponseType
        : OAuthErrorCode.InvalidRequest;
      res.redirect(HttpStatus.FOUND, this.buildErrorRedirectUrl(query, errorCode));

      return;
    }

    try {
      await this.queryBus.execute(
        new ValidateAuthorizationQuery(query.client_id, query.redirect_uri, query.scope.split(SCOPE_SEPARATOR))
      );
      res.redirect(HttpStatus.FOUND, this.buildConsentUrl(query));
    } catch (error) {
      if (error instanceof InvalidValueObjectException) {
        res.redirect(HttpStatus.FOUND, this.buildErrorRedirectUrl(query, OAuthErrorCode.InvalidScope));

        return;
      }

      if (error instanceof DomainException) {
        const code = mapOAuthRedirectErrorCode(error);

        if (code !== undefined) {
          res.redirect(HttpStatus.FOUND, this.buildErrorRedirectUrl(query, code));

          return;
        }
      }

      this.logger.error(
        "OAuth authorization failed after client redirect validation",
        error instanceof Error ? error.stack : undefined
      );
      res.redirect(HttpStatus.FOUND, this.buildErrorRedirectUrl(query, OAuthErrorCode.ServerError));
    }
  }

  @Post("authorize")
  @HttpCode(HttpStatus.OK)
  async authorize(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    request: AuthorizeCodeRequest
  ): Promise<AuthorizeResponse> {
    const command = new IssueCodeCommand(
      toRequester(currentUser),
      request.clientId,
      request.redirectUri,
      request.scope.split(SCOPE_SEPARATOR)
    );
    const result = await this.commandBus.execute<IssueCodeCommand, IssueCodeResult>(command);
    const callbackUrl = new URL(request.redirectUri);
    callbackUrl.searchParams.set("code", result.code);

    if (request.state !== undefined) {
      callbackUrl.searchParams.set("state", request.state);
    }

    return new AuthorizeResponse(callbackUrl.toString());
  }

  @Public()
  @Post("token")
  @Header("Cache-Control", "no-store")
  @Header("Pragma", "no-cache")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async token(
    @Body()
    request: TokenRequest
  ): Promise<TokenResponse> {
    if (request.grantType === GRANT_TYPE_REFRESH_TOKEN) {
      const refreshToken = request.refreshToken;

      if (refreshToken === undefined) {
        throw validationExceptionFactory([
          { property: "refreshToken", constraints: { isDefined: "refreshToken is required" } },
        ]);
      }

      return new TokenResponse(
        await this.tokens.refresh(ClientId.from(request.clientId), request.clientSecret, refreshToken)
      );
    }

    const code = request.code;

    if (code === undefined) {
      throw validationExceptionFactory([{ property: "code", constraints: { isDefined: "code is required" } }]);
    }

    const command = new RedeemCodeCommand(request.clientId, request.clientSecret, code, request.redirectUri);
    const result = await this.commandBus.execute<RedeemCodeCommand, RedeemCodeResult>(command);

    return new TokenResponse(result);
  }

  private buildConsentUrl(query: AuthorizeQuery): string {
    const appWebUrl = this.configService.getOrThrow<string>("APP_WEB_URL");
    const consentUrl = new URL(WEB_CONSENT_PAGE_PATH, appWebUrl);
    consentUrl.searchParams.set("response_type", query.response_type);
    consentUrl.searchParams.set("client_id", query.client_id);
    consentUrl.searchParams.set("redirect_uri", query.redirect_uri);
    consentUrl.searchParams.set("scope", query.scope);

    if (query.state !== undefined) {
      consentUrl.searchParams.set("state", query.state);
    }

    return consentUrl.toString();
  }

  private buildErrorRedirectUrl(query: AuthorizeQuery, errorCode: string): string {
    const callbackUrl = new URL(query.redirect_uri);
    callbackUrl.searchParams.set("error", errorCode);

    if (typeof query.state === "string" && query.state.length > 0 && query.state.length <= STATE_MAX_LENGTH) {
      callbackUrl.searchParams.set("state", query.state);
    }

    return callbackUrl.toString();
  }
}
