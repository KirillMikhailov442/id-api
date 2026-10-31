import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessTokenResolver } from "@shared/auth/access-token-resolver";
import { OAUTH_SCOPES_KEY } from "@shared/auth/decorator/oauth-access-token.decorator";
import { IS_PUBLIC_KEY } from "@shared/auth/decorator/public.decorator";
import { SESSION_ACCESS_TOKEN_KEY } from "@shared/auth/decorator/session-access-token.decorator";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";
import { accessToken, authContext, oauthAuth, sessionAuth } from "@shared/testing/auth-test.spec-support";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { OAuthAuthorizationService } from "@modules/oauth/application/service/oauth-authorization.service";
import { OAuthAccessTokenGuard } from "@modules/oauth/presentation/guard/oauth-access-token.guard";
import { SessionAuthenticationService } from "@modules/session/infrastructure/security/token/session-authentication.service";
import { SessionAccessTokenGuard } from "@modules/session/presentation/guard/session-access-token.guard";

describe("OAuthAccessTokenGuard", () => {
  const authorize = mockFn<OAuthAuthorizationService["authorize"]>();
  let guard: OAuthAccessTokenGuard;

  beforeEach(async () => {
    authorize.mockReset();
    guard = await testHandler(OAuthAccessTokenGuard, [
      { provide: Reflector, useValue: new Reflector() },
      { provide: AccessTokenResolver, useValue: new AccessTokenResolver(new Reflector()) },
      { provide: OAuthAuthorizationService, useValue: { authorize } },
    ]);
  });

  it.each(["handler", "controller"] as const)(
    "authorizes with scopes from the %s and attaches the auth result",
    async (target) => {
      const token = accessToken(AccessTokenType.OAuth);
      const fixture = authContext(`Bearer ${token}`);
      const scopes = ["profile:read", "email:read"];
      Reflect.defineMetadata(OAUTH_SCOPES_KEY, scopes, fixture[target]);

      const auth = oauthAuth(scopes);
      authorize.mockResolvedValue(auth);
      await expect(guard.canActivate(fixture.context)).resolves.toBe(true);
      expect(authorize).toHaveBeenCalledTimes(1);
      expect(authorize).toHaveBeenCalledWith(token, scopes);
      expect(fixture.request.auth).toBe(auth);
      expect(fixture.request.user).toBeUndefined();
    }
  );

  it("uses method scopes instead of controller scopes", async () => {
    const fixture = authContext(`Bearer ${accessToken(AccessTokenType.OAuth)}`);
    Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["admin:write"], fixture.controller);
    Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["profile:read"], fixture.handler);
    authorize.mockResolvedValue(oauthAuth());
    await expect(guard.canActivate(fixture.context)).resolves.toBe(true);
    expect(authorize).toHaveBeenCalledWith(accessToken(AccessTokenType.OAuth), ["profile:read"]);
  });

  it("rejects an explicit empty scope list instead of inheriting controller scopes", async () => {
    const fixture = authContext(`Bearer ${accessToken(AccessTokenType.OAuth)}`);
    Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["profile:read"], fixture.controller);
    Reflect.defineMetadata(OAUTH_SCOPES_KEY, [], fixture.handler);
    await expect(guard.canActivate(fixture.context)).rejects.toThrow(ForbiddenException);
    expect(authorize).not.toHaveBeenCalled();
    expect(fixture.request.auth).toBeUndefined();
  });

  it("rejects missing scope requirements even if a resolver returns an OAuth token", async () => {
    const resolve = mockFn<AccessTokenResolver["resolve"]>();
    resolve.mockReturnValue({ token: "oauth-token", type: AccessTokenType.OAuth });

    const isolated = await testHandler(OAuthAccessTokenGuard, [
      { provide: Reflector, useValue: new Reflector() },
      { provide: AccessTokenResolver, useValue: { resolve } },
      { provide: OAuthAuthorizationService, useValue: { authorize } },
    ]);
    await expect(isolated.canActivate(authContext().context)).rejects.toThrow(ForbiddenException);
    expect(authorize).not.toHaveBeenCalled();
  });

  it.each(["public", "session"])("skips OAuth authorization on %s requests", async (kind) => {
    const fixture = authContext(`Bearer ${accessToken(AccessTokenType.Session)}`);

    if (kind === "public") Reflect.defineMetadata(IS_PUBLIC_KEY, true, fixture.handler);

    const auth = sessionAuth();
    fixture.request.auth = auth;
    fixture.request.user = auth;
    await expect(guard.canActivate(fixture.context)).resolves.toBe(true);
    expect(authorize).not.toHaveBeenCalled();
    expect(fixture.request.auth).toBe(auth);
    expect(fixture.request.user).toBe(auth);
  });

  it.each([
    new UnauthorizedException("Revoked grant"),
    new ForbiddenException("Insufficient OAuth scope"),
    new Error("Authorization store unavailable"),
  ])("propagates authorization failures: %p", async (error) => {
    const fixture = authContext(`Bearer ${accessToken(AccessTokenType.OAuth)}`);
    Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["profile:read"], fixture.handler);
    authorize.mockRejectedValue(error);
    await expect(guard.canActivate(fixture.context)).rejects.toBe(error);
    expect(fixture.request.auth).toBeUndefined();
    expect(fixture.request.user).toBeUndefined();
  });

  it("rejects malformed tokens before calling authorization", async () => {
    await expect(guard.canActivate(authContext("Bearer malformed").context)).rejects.toThrow(
      InvalidAccessTokenException
    );
    expect(authorize).not.toHaveBeenCalled();
  });

  it.each([AccessTokenType.Session, AccessTokenType.OAuth])(
    "runs both token guards in application order for %s",
    async (type) => {
      const authenticate = mockFn<SessionAuthenticationService["authenticate"]>();
      const sessionGuard = await testHandler(SessionAccessTokenGuard, [
        { provide: AccessTokenResolver, useValue: new AccessTokenResolver(new Reflector()) },
        { provide: SessionAuthenticationService, useValue: { authenticate } },
      ]);
      const fixture = authContext(`Bearer ${accessToken(type)}`);
      Reflect.defineMetadata(SESSION_ACCESS_TOKEN_KEY, true, fixture.handler);
      Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["profile:read"], fixture.handler);
      fixture.request.auth = sessionAuth(["ADMIN"]);
      fixture.request.user = sessionAuth(["ADMIN"]);

      const auth = type === AccessTokenType.Session ? sessionAuth(["USER"]) : oauthAuth();
      authenticate.mockResolvedValue(sessionAuth(["USER"]));
      authorize.mockResolvedValue(oauthAuth());
      await expect(sessionGuard.canActivate(fixture.context)).resolves.toBe(true);
      await expect(guard.canActivate(fixture.context)).resolves.toBe(true);
      expect(fixture.request.auth).toEqual(auth);

      if (type === AccessTokenType.Session) {
        expect(authorize).not.toHaveBeenCalled();
        expect(authenticate).toHaveBeenCalledWith(accessToken(type));
        expect(fixture.request.user).toEqual(auth);
      } else {
        expect(authenticate).not.toHaveBeenCalled();
        expect(authorize).toHaveBeenCalledWith(accessToken(type), ["profile:read"]);
        expect(fixture.request.user).toBeUndefined();
      }
    }
  );
});
