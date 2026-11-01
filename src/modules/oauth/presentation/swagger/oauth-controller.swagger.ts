import { HttpStatus } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";

import { OAuthController } from "@modules/oauth/presentation/controller/v1/oauth.controller";
import { AuthorizeQuery } from "@modules/oauth/presentation/dto/v1/authorize.query";
import { AuthorizeResponse } from "@modules/oauth/presentation/dto/v1/authorize.response";
import { JwksResponse } from "@modules/oauth/presentation/dto/v1/jwks.response";
import { TokenResponse } from "@modules/oauth/presentation/dto/v1/token.response";
import {
  ApiAuthorizationCodeAlreadyUsedResponse,
  ApiAuthorizationCodeExpiredResponse,
  ApiAuthorizationScopesNotAllowedResponse,
  ApiClientInactiveResponse,
  ApiClientNotFoundResponse,
  ApiInvalidAuthorizationCodeResponse,
  ApiInvalidClientCredentialsResponse,
  ApiRedirectUriNotAllowedResponse,
} from "@modules/oauth/presentation/exception-response.decorator";
import { ApiAuthenticatedResponse } from "@modules/session/presentation/exception-response.decorator";
import { ApiUnexpectedErrorResponse } from "@modules/user/presentation/exception-response.decorator";

type OAuthControllerMethod = {
  [K in keyof OAuthController]: OAuthController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof OAuthController];

export class OAuthControllerSwagger {
  static register(): void {
    ApiTags("oauth")(OAuthController);

    this.documentMethod(
      "jwks",
      ApiOperation({
        description:
          "Public endpoint; no Bearer token or client secret is required. Returns the current RSA public signing key " +
          "as a JSON Web Key Set (JWKS). The private key is never returned.\n\n" +
          "To verify an ID token:\n" +
          "1. Fetch this endpoint from your application's backend and cache the keys.\n" +
          "2. Select the key whose kid matches the ID token's kid header. Reject the token if no matching key is " +
          "available after refreshing the keys.\n" +
          "3. Verify the signature using a JWT library with RS256 explicitly allowed.\n" +
          "4. Validate iss against the configured IdP issuer (APP_BASE_URL), aud against your application's client ID, " +
          "and exp against the current time. Decoding a JWT alone does not verify it.\n\n" +
          "The response contains keys with kty, use, alg, kid, n and e. Only the current signing key is published; " +
          "overlapping key rotation is not supported yet. These keys verify ID tokens and OAuth access tokens; session access tokens use " +
          "a separate signing secret.",
      }),
      ApiOkResponse({
        type: JwksResponse,
        description: "JSON Web Key Set containing the current public RSA key for RS256 ID token verification",
      }),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "authorizeRedirect",
      ApiQuery({ type: AuthorizeQuery }),
      ApiOperation({
        description:
          "Front channel of the authorization code flow: validates the authorization request and redirects the browser " +
          "to the IdP consent page, or back to the client with an OAuth error",
      }),
      ApiResponse({
        status: HttpStatus.FOUND,
        description: "Redirect to the IdP consent page or to the client callback",
      }),
      ApiRedirectUriNotAllowedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "authorize",
      ApiOperation({
        description:
          "Revalidates the client, redirect URI and scopes against the database, issues a one-time authorization code " +
          "for the authenticated resource owner and returns the callback URL for the web client to navigate to",
      }),
      ApiAuthenticatedResponse(),
      ApiOkResponse({ type: AuthorizeResponse, description: "Client callback URL with code and optional state" }),
      ApiClientNotFoundResponse(),
      ApiRedirectUriNotAllowedResponse(),
      ApiAuthorizationScopesNotAllowedResponse(),
      ApiClientInactiveResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "token",
      ApiOperation({
        description: "Exchanges an authorization code or refresh token for OAuth tokens; requires client credentials",
      }),
      ApiOkResponse({ type: TokenResponse, description: "Authorization code redeemed" }),
      ApiInvalidAuthorizationCodeResponse(),
      ApiInvalidClientCredentialsResponse(),
      ApiAuthorizationCodeExpiredResponse(),
      ApiAuthorizationCodeAlreadyUsedResponse(),
      ApiClientInactiveResponse(),
      ApiUnexpectedErrorResponse()
    );
  }

  private static documentMethod(name: OAuthControllerMethod, ...decorators: MethodDecorator[]): void {
    const descriptor = Object.getOwnPropertyDescriptor(OAuthController.prototype, name);

    if (descriptor === undefined) {
      throw new Error(`OAuthController.${name} does not exist`);
    }

    for (const decorator of [...decorators].reverse()) {
      decorator(OAuthController.prototype, name, descriptor);
    }
  }
}
