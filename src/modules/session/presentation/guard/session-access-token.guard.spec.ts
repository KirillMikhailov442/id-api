import { Reflector } from "@nestjs/core";
import { AccessTokenResolver } from "@shared/auth/access-token-resolver";
import { OAUTH_SCOPES_KEY } from "@shared/auth/decorator/oauth-access-token.decorator";
import { IS_PUBLIC_KEY } from "@shared/auth/decorator/public.decorator";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";
import { accessToken, authContext, oauthAuth, sessionAuth } from "@shared/testing/auth-test.spec-support";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { SessionAuthenticationService } from "@modules/session/infrastructure/security/token/session-authentication.service";
import { SessionAccessTokenGuard } from "@modules/session/presentation/guard/session-access-token.guard";

describe("SessionAccessTokenGuard", () => {
  const authenticate = mockFn<SessionAuthenticationService["authenticate"]>();
  let guard: SessionAccessTokenGuard;

  beforeEach(async () => {
    authenticate.mockReset();
    guard = await testHandler(SessionAccessTokenGuard, [
      { provide: AccessTokenResolver, useValue: new AccessTokenResolver(new Reflector()) },
      { provide: SessionAuthenticationService, useValue: { authenticate } },
    ]);
  });

  it("authenticates a session token and replaces untrusted request auth and user data", async () => {
    const token = accessToken(AccessTokenType.Session);
    const fixture = authContext(`Bearer ${token}`);
    fixture.request.auth = oauthAuth();
    fixture.request.user = sessionAuth(["ADMIN"]);

    const auth = sessionAuth(["USER"]);
    authenticate.mockResolvedValue(auth);
    await expect(guard.canActivate(fixture.context)).resolves.toBe(true);
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(authenticate).toHaveBeenCalledWith(token);
    expect(fixture.request.auth).toBe(auth);
    expect(fixture.request.user).toBe(auth);
  });

  it.each(["public", "oauth"])("skips session authentication for %s requests and clears stale auth", async (kind) => {
    const fixture = authContext(`Bearer ${accessToken(AccessTokenType.OAuth)}`);

    if (kind === "public") Reflect.defineMetadata(IS_PUBLIC_KEY, true, fixture.handler);
    else Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["profile:read"], fixture.handler);

    fixture.request.auth = sessionAuth(["ADMIN"]);
    fixture.request.user = sessionAuth(["ADMIN"]);
    await expect(guard.canActivate(fixture.context)).resolves.toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
    expect(fixture.request.auth).toBeUndefined();
    expect(fixture.request.user).toBeUndefined();
  });

  it.each([new InvalidAccessTokenException(), new Error("Authentication store unavailable")])(
    "propagates authentication errors without retaining identity: %p",
    async (error) => {
      const fixture = authContext(`Bearer ${accessToken(AccessTokenType.Session)}`);
      fixture.request.auth = sessionAuth(["ADMIN"]);
      fixture.request.user = sessionAuth(["ADMIN"]);
      authenticate.mockRejectedValue(error);
      await expect(guard.canActivate(fixture.context)).rejects.toBe(error);
      expect(fixture.request.auth).toBeUndefined();
      expect(fixture.request.user).toBeUndefined();
    }
  );

  it("rejects invalid tokens before authentication and clears stale identity", async () => {
    const fixture = authContext("Bearer malformed");
    fixture.request.auth = sessionAuth(["ADMIN"]);
    fixture.request.user = sessionAuth(["ADMIN"]);
    await expect(guard.canActivate(fixture.context)).rejects.toThrow(InvalidAccessTokenException);
    expect(authenticate).not.toHaveBeenCalled();
    expect(fixture.request.auth).toBeUndefined();
    expect(fixture.request.user).toBeUndefined();
  });
});
