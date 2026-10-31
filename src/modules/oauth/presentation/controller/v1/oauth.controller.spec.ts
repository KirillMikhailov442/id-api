import type { Server } from "node:http";
import { Logger, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import { DomainException } from "@shared/exception/base/domain.exception";
import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import { HttpStatus } from "@shared/http/http-status.enum";
import { controllerApp, testSessionAuth } from "@shared/testing/controller-test.spec-support";
import { mockFn } from "@shared/testing/handler-test.spec-support";
import request from "supertest";

import { IssueCodeCommand } from "@modules/oauth/application/command/issue-code.command";
import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import type { OAuthTokenResult } from "@modules/oauth/application/port/oauth-token-result.type";
import { GetJwksQuery } from "@modules/oauth/application/query/get-jwks.query";
import { ValidateAuthorizationQuery } from "@modules/oauth/application/query/validate-authorization.query";
import { ValidateClientRedirectQuery } from "@modules/oauth/application/query/validate-client-redirect.query";
import { OAuthTokenExchangeService } from "@modules/oauth/application/service/oauth-token-exchange.service";
import { AuthorizationCodeExpiredException } from "@modules/oauth/domain/exception/authorization-code-expired.exception";
import { AuthorizationScopesNotAllowedException } from "@modules/oauth/domain/exception/authorization-scopes-not-allowed.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { InvalidClientCredentialsException } from "@modules/oauth/domain/exception/invalid-client-credentials.exception";
import { RedirectUriNotAllowedException } from "@modules/oauth/domain/exception/redirect-uri-not-allowed.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { ClientId } from "@modules/oauth/oauth.ids";
import { OAuthController } from "@modules/oauth/presentation/controller/v1/oauth.controller";

class UnmappedOAuthError extends DomainException {
  constructor() {
    super("private details", "UNMAPPED", HttpStatus.InternalServerError);
  }
}

describe("OAuthController (HTTP)", () => {
  let app: INestApplication<Server>;
  let auth: AuthContext | undefined;
  const execute = jest.fn<Promise<unknown>, [unknown]>();
  const query = jest.fn<Promise<unknown>, [unknown]>();
  const refresh = mockFn<OAuthTokenExchangeService["refresh"]>();
  const clientId = "00000000-0000-4000-8000-000000000003";
  const callback = "https://client.example.com/callback?existing=1";
  const actor = { userId: testSessionAuth.userId, roles: testSessionAuth.roles };
  const authorization = {
    client_id: clientId,
    response_type: "code",
    redirect_uri: callback,
    scope: "openid profile",
    state: "state+value",
  };
  const tokenBody = {
    grantType: "authorization_code",
    clientId,
    clientSecret: "test-client-secret",
    code: "raw-code",
    redirectUri: callback,
  };
  const tokenResult: OAuthTokenResult = {
    clientId,
    userId: testSessionAuth.userId,
    scopes: ["openid", "profile"],
    accessToken: "access",
    refreshToken: "refresh",
    idToken: "id-token",
    expiresIn: 900,
  };
  const tokenResponse = {
    accessToken: "access",
    refreshToken: "refresh",
    idToken: "id-token",
    tokenType: "Bearer",
    expiresIn: 900,
    clientId,
    userId: testSessionAuth.userId,
    scopes: ["openid", "profile"],
    access_token: "access",
    refresh_token: "refresh",
    id_token: "id-token",
    token_type: "Bearer",
    expires_in: 900,
    scope: "openid profile",
  };

  beforeAll(async () => {
    app = await controllerApp(
      OAuthController,
      [
        { provide: CommandBus, useValue: { execute } },
        { provide: QueryBus, useValue: { execute: query } },
        { provide: ConfigService, useValue: new ConfigService({ APP_WEB_URL: "https://app.example.com/" }) },
        { provide: OAuthTokenExchangeService, useValue: { refresh } },
      ],
      () => auth
    );
  });

  beforeEach(() => {
    execute.mockReset();
    query.mockReset();
    refresh.mockReset();
    auth = testSessionAuth;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns public JWKS fields without private key material", async () => {
    const key = { kty: "RSA", use: "sig", alg: "RS256", kid: "key-1", n: "modulus", e: "AQAB" };
    query.mockResolvedValue([{ ...key, d: "private-exponent" }]);

    const response = await request(app.getHttpServer()).get("/v1/oauth/jwks").expect(200);
    expect(query).toHaveBeenCalledWith(new GetJwksQuery());
    expect(response.body).toEqual({ keys: [key] });
  });

  it("returns an empty JWKS", async () => {
    query.mockResolvedValue([]);

    const response = await request(app.getHttpServer()).get("/v1/oauth/jwks").expect(200);
    expect(response.body).toEqual({ keys: [] });
  });

  it.each([true, false])("validates the callback before redirecting to consent, state=%s", async (withState) => {
    query.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .get("/v1/oauth/authorize")
      .query({ ...authorization, state: withState ? authorization.state : undefined })
      .expect(302);
    expect(query).toHaveBeenNthCalledWith(1, new ValidateClientRedirectQuery(clientId, callback));
    expect(query).toHaveBeenNthCalledWith(2, new ValidateAuthorizationQuery(clientId, callback, ["openid", "profile"]));

    const location = new URL(response.get("Location") ?? "");
    expect(location.origin + location.pathname).toBe("https://app.example.com/consent");
    expect(Object.fromEntries(location.searchParams)).toEqual({
      ...authorization,
      ...(withState ? {} : { state: undefined }),
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    { name: "invalid client ID", params: { ...authorization, client_id: "invalid" } },
    { name: "missing callback", params: { client_id: clientId, response_type: "code", scope: "profile" } },
    { name: "relative callback", params: { ...authorization, redirect_uri: "relative" } },
  ])("returns 422 without redirecting for $name", async ({ params }) => {
    const response = await request(app.getHttpServer()).get("/v1/oauth/authorize").query(params).expect(422);
    expect(query).not.toHaveBeenCalled();
    expect(response.get("Location")).toBeUndefined();
  });

  it.each([new ClientNotFoundException(), new RedirectUriNotAllowedException()])(
    "does not redirect when callback validation rejects %s",
    async (error) => {
      query.mockRejectedValue(error);

      const response = await request(app.getHttpServer())
        .get("/v1/oauth/authorize")
        .query(authorization)
        .expect(error.status);
      expect(query).toHaveBeenCalledTimes(1);
      expect(response.get("Location")).toBeUndefined();
    }
  );

  it.each([
    { params: { ...authorization, response_type: "token" }, error: "unsupported_response_type" },
    { params: { ...authorization, scope: "" }, error: "invalid_request" },
  ])("redirects invalid requests with $error only after validating the callback", async ({ params, error }) => {
    query.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer()).get("/v1/oauth/authorize").query(params).expect(302);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(new ValidateClientRedirectQuery(clientId, callback));

    const location = new URL(response.get("Location") ?? "");
    expect(location.origin + location.pathname).toBe("https://client.example.com/callback");
    expect(Object.fromEntries(location.searchParams)).toEqual({ existing: "1", error, state: authorization.state });
  });

  it.each([
    { exception: new InvalidValueObjectException("invalid scopes"), error: "invalid_scope" },
    { exception: new AuthorizationScopesNotAllowedException(), error: "invalid_scope" },
    { exception: new ScopeNotFoundException(), error: "invalid_scope" },
    { exception: new ClientInactiveException(), error: "unauthorized_client" },
  ])("maps authorization errors to $error", async ({ exception, error }) => {
    query.mockResolvedValueOnce(undefined).mockRejectedValueOnce(exception);

    const response = await request(app.getHttpServer()).get("/v1/oauth/authorize").query(authorization).expect(302);
    const location = new URL(response.get("Location") ?? "");
    expect(Object.fromEntries(location.searchParams)).toEqual({ existing: "1", error, state: authorization.state });
  });

  it.each([new Error("private details"), new UnmappedOAuthError()])(
    "redirects unexpected errors as server_error without exposing details",
    async (error) => {
      jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
      query.mockResolvedValueOnce(undefined).mockRejectedValueOnce(error);

      const response = await request(app.getHttpServer()).get("/v1/oauth/authorize").query(authorization).expect(302);
      const location = new URL(response.get("Location") ?? "");
      expect(Object.fromEntries(location.searchParams)).toEqual({
        existing: "1",
        error: "server_error",
        state: authorization.state,
      });
    }
  );

  it.each(["", "s".repeat(256)])("does not reflect invalid state in the error callback", async (state) => {
    query.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .get("/v1/oauth/authorize")
      .query({ ...authorization, state })
      .expect(302);
    const location = new URL(response.get("Location") ?? "");
    expect(location.searchParams.has("state")).toBe(false);
    expect(location.searchParams.get("error")).toBe("invalid_request");
  });

  it.each([true, false])("issues a code and builds the callback URL, state=%s", async (withState) => {
    execute.mockResolvedValue({ code: "code+value", expiresAt: new Date("2100-01-01") });

    const response = await request(app.getHttpServer())
      .post("/v1/oauth/authorize")
      .send({
        clientId,
        redirectUri: callback,
        scope: "openid profile",
        ...(withState ? { state: "state+value" } : {}),
      })
      .expect(200);
    expect(execute).toHaveBeenCalledWith(new IssueCodeCommand(actor, clientId, callback, ["openid", "profile"]));
    expect(response.body).toEqual({
      redirectUrl:
        "https://client.example.com/callback?existing=1&code=code%2Bvalue" + (withState ? "&state=state%2Bvalue" : ""),
    });
  });

  it("rejects code issuance without a current user", async () => {
    auth = undefined;
    await request(app.getHttpServer())
      .post("/v1/oauth/authorize")
      .send({ clientId, redirectUri: callback, scope: "profile" })
      .expect(401);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    { clientId: "invalid", redirectUri: callback, scope: "profile" },
    { clientId, redirectUri: "relative", scope: "profile" },
    { clientId, redirectUri: callback, scope: "" },
  ])("validates code issuance bodies %j", async (body) => {
    await request(app.getHttpServer()).post("/v1/oauth/authorize").send(body).expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it("propagates code issuance failures without returning a callback URL", async () => {
    execute.mockRejectedValue(new ClientInactiveException());

    const response = await request(app.getHttpServer())
      .post("/v1/oauth/authorize")
      .send({ clientId, redirectUri: callback, scope: "profile" })
      .expect(403);
    expect(response.body).toMatchObject({ code: "CLIENT_INACTIVE" });
    expect(response.body).not.toHaveProperty("redirectUrl");
  });

  it.each(["json", "form"] as const)("exchanges authorization codes submitted as %s", async (format) => {
    execute.mockResolvedValue(tokenResult);

    const httpRequest = request(app.getHttpServer()).post("/v1/oauth/token");
    const response = await (
      format === "form"
        ? httpRequest.type("form").send({
            grant_type: "authorization_code",
            client_id: clientId,
            client_secret: "test-client-secret",
            code: "raw-code",
            redirect_uri: callback,
          })
        : httpRequest.send(tokenBody)
    ).expect(200);
    expect(execute).toHaveBeenCalledWith(new RedeemCodeCommand(clientId, "test-client-secret", "raw-code", callback));
    expect(refresh).not.toHaveBeenCalled();
    expect(response.body).toEqual(tokenResponse);
    expect(response.get("Cache-Control")).toBe("no-store");
    expect(response.get("Pragma")).toBe("no-cache");
  });

  it.each(["json", "form"] as const)("refreshes OAuth tokens submitted as %s", async (format) => {
    refresh.mockResolvedValue(tokenResult);

    const httpRequest = request(app.getHttpServer()).post("/v1/oauth/token");
    const response = await (
      format === "form"
        ? httpRequest.type("form").send({
            grant_type: "refresh_token",
            client_id: clientId,
            client_secret: "test-client-secret",
            refresh_token: "old-refresh",
          })
        : httpRequest.send({
            grantType: "refresh_token",
            clientId,
            clientSecret: "test-client-secret",
            refreshToken: "old-refresh",
          })
    ).expect(200);
    expect(refresh).toHaveBeenCalledWith(ClientId.from(clientId), "test-client-secret", "old-refresh");
    expect(execute).not.toHaveBeenCalled();
    expect(response.body).toEqual(tokenResponse);
    expect(response.get("Cache-Control")).toBe("no-store");
    expect(response.get("Pragma")).toBe("no-cache");
  });

  it("omits optional tokens when the exchange does not issue them", async () => {
    execute.mockResolvedValue({
      clientId,
      userId: testSessionAuth.userId,
      scopes: ["profile"],
      accessToken: "access",
      expiresIn: 900,
    });

    const response = await request(app.getHttpServer()).post("/v1/oauth/token").send(tokenBody).expect(200);
    expect(response.body).toEqual({
      accessToken: "access",
      access_token: "access",
      tokenType: "Bearer",
      token_type: "Bearer",
      expiresIn: 900,
      expires_in: 900,
      clientId,
      userId: testSessionAuth.userId,
      scopes: ["profile"],
      scope: "profile",
    });
  });

  it("supports code exchanges without an optional redirect URI", async () => {
    execute.mockResolvedValue(tokenResult);
    await request(app.getHttpServer())
      .post("/v1/oauth/token")
      .send({ ...tokenBody, redirectUri: undefined })
      .expect(200);
    expect(execute).toHaveBeenCalledWith(new RedeemCodeCommand(clientId, "test-client-secret", "raw-code"));
  });

  it.each([
    { name: "unsupported grant", body: { ...tokenBody, grantType: "password" } },
    { name: "missing code", body: { ...tokenBody, code: undefined } },
    { name: "empty code", body: { ...tokenBody, code: "" } },
    { name: "invalid client ID", body: { ...tokenBody, clientId: "invalid" } },
    { name: "short secret", body: { ...tokenBody, clientSecret: "short" } },
    { name: "invalid redirect", body: { ...tokenBody, redirectUri: "relative" } },
    {
      name: "missing refresh token",
      body: { grantType: "refresh_token", clientId, clientSecret: "test-client-secret" },
    },
    {
      name: "empty refresh token",
      body: { grantType: "refresh_token", clientId, clientSecret: "test-client-secret", refreshToken: "" },
    },
  ])("rejects token requests with $name before invoking dependencies", async ({ body }) => {
    const response = await request(app.getHttpServer()).post("/v1/oauth/token").send(body).expect(422);
    expect(response.body).toMatchObject({ code: "VALIDATION_FAILED" });
    expect(execute).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("returns invalid client credentials from code exchange", async () => {
    execute.mockRejectedValue(new InvalidClientCredentialsException());

    const response = await request(app.getHttpServer()).post("/v1/oauth/token").send(tokenBody).expect(401);
    expect(response.body).toMatchObject({ code: "INVALID_CLIENT_CREDENTIALS" });
  });

  it("returns expired authorization-code errors", async () => {
    execute.mockRejectedValue(new AuthorizationCodeExpiredException());

    const response = await request(app.getHttpServer()).post("/v1/oauth/token").send(tokenBody).expect(400);
    expect(response.body).toMatchObject({ code: "AUTHORIZATION_CODE_EXPIRED" });
  });

  it("propagates refresh failures without executing a code exchange", async () => {
    refresh.mockRejectedValue(new InvalidClientCredentialsException());

    const response = await request(app.getHttpServer())
      .post("/v1/oauth/token")
      .send({ grantType: "refresh_token", clientId, clientSecret: "test-client-secret", refreshToken: "old-refresh" })
      .expect(401);
    expect(response.body).toMatchObject({ code: "INVALID_CLIENT_CREDENTIALS" });
    expect(execute).not.toHaveBeenCalled();
  });
});
