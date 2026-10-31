import { Reflector } from "@nestjs/core";
import { AccessTokenResolver } from "@shared/auth/access-token-resolver";
import { OAUTH_SCOPES_KEY } from "@shared/auth/decorator/oauth-access-token.decorator";
import { IS_PUBLIC_KEY } from "@shared/auth/decorator/public.decorator";
import { SESSION_ACCESS_TOKEN_KEY } from "@shared/auth/decorator/session-access-token.decorator";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";
import { accessToken, authContext } from "@shared/testing/auth-test.spec-support";

describe("AccessTokenResolver", () => {
  const resolver = new AccessTokenResolver(new Reflector());
  const sessionToken = accessToken(AccessTokenType.Session);
  const oauthToken = accessToken(AccessTokenType.OAuth);

  it.each(["handler", "controller"] as const)("skips authentication for public metadata on the %s", (target) => {
    const fixture = authContext("malformed");
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, fixture[target]);
    expect(resolver.resolve(fixture.context)).toBeNull();
  });

  it("lets explicit method metadata override a public controller", () => {
    const fixture = authContext();
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, fixture.controller);
    Reflect.defineMetadata(IS_PUBLIC_KEY, false, fixture.handler);
    expect(() => resolver.resolve(fixture.context)).toThrow(InvalidAccessTokenException);
  });

  it.each([undefined, "", "Basic abc", "bearer abc", "Bearer", "Bearer ", "Bearer    "])(
    "rejects a missing or invalid bearer header %p",
    (header) => {
      expect(() => resolver.resolve(authContext(header).context)).toThrow(InvalidAccessTokenException);
    }
  );

  it.each([42, ["Bearer abc"], null])("rejects non-string headers %p", (header) => {
    const fixture = authContext();
    Object.assign(fixture.request.headers, { authorization: header });
    expect(() => resolver.resolve(fixture.context)).toThrow(InvalidAccessTokenException);
  });

  it("accepts session tokens by default and trims surrounding bearer whitespace", () => {
    expect(resolver.resolve(authContext(`Bearer   ${sessionToken}  `).context)).toEqual({
      token: sessionToken,
      type: AccessTokenType.Session,
    });
  });

  it("rejects OAuth tokens on endpoints without token metadata", () => {
    expect(() => resolver.resolve(authContext(`Bearer ${oauthToken}`).context)).toThrow(InvalidAccessTokenException);
  });

  it.each(["handler", "controller"] as const)("accepts only the declared OAuth type on the %s", (target) => {
    const fixture = authContext(`Bearer ${oauthToken}`);
    Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["profile:read"], fixture[target]);
    expect(resolver.resolve(fixture.context)).toEqual({ token: oauthToken, type: AccessTokenType.OAuth });
    fixture.request.headers.authorization = `Bearer ${sessionToken}`;
    expect(() => resolver.resolve(fixture.context)).toThrow(InvalidAccessTokenException);
  });

  it.each([AccessTokenType.Session, AccessTokenType.OAuth])("accepts %s when both token types are declared", (type) => {
    const fixture = authContext(`Bearer ${accessToken(type)}`);
    Reflect.defineMetadata(SESSION_ACCESS_TOKEN_KEY, true, fixture.handler);
    Reflect.defineMetadata(OAUTH_SCOPES_KEY, ["profile:read"], fixture.handler);
    expect(resolver.resolve(fixture.context)?.type).toBe(type);
  });

  it.each([
    [
      SESSION_ACCESS_TOKEN_KEY,
      true,
      OAUTH_SCOPES_KEY,
      ["profile:read"],
      AccessTokenType.Session,
      AccessTokenType.OAuth,
    ],
    [
      OAUTH_SCOPES_KEY,
      ["profile:read"],
      SESSION_ACCESS_TOKEN_KEY,
      true,
      AccessTokenType.OAuth,
      AccessTokenType.Session,
    ],
  ] as const)(
    "uses method token declarations instead of inheriting controller types: %s",
    (methodKey, methodValue, classKey, classValue, accepted, rejected) => {
      const fixture = authContext(`Bearer ${accessToken(accepted)}`);
      Reflect.defineMetadata(methodKey, methodValue, fixture.handler);
      Reflect.defineMetadata(classKey, classValue, fixture.controller);
      expect(resolver.resolve(fixture.context)?.type).toBe(accepted);
      fixture.request.headers.authorization = `Bearer ${accessToken(rejected)}`;
      expect(() => resolver.resolve(fixture.context)).toThrow(InvalidAccessTokenException);
    }
  );

  it("honors an explicit disabled session token declaration", () => {
    const fixture = authContext(`Bearer ${sessionToken}`);
    Reflect.defineMetadata(SESSION_ACCESS_TOKEN_KEY, false, fixture.handler);
    expect(() => resolver.resolve(fixture.context)).toThrow(InvalidAccessTokenException);
  });

  it.each([
    "abc",
    "a.b",
    "a.b.c.d",
    ".e30.c2ln",
    "e30..c2ln",
    "e30.e30.",
    "e30.e30.c2ln=",
    "e30.e30.a+b",
    "bm90LWpzb24.e30.c2ln",
    ...[
      null,
      [],
      "header",
      42,
      {},
      { typ: "JWT", alg: "none" },
      { typ: "JWT", alg: "RS256" },
      { typ: "at+jwt", alg: "HS256" },
      { typ: "JWT", alg: "HS512" },
      { typ: "jwt", alg: "HS256" },
    ].map((header) => `${Buffer.from(JSON.stringify(header)).toString("base64url")}.e30.c2ln`),
  ])("rejects malformed or unsupported token %s", (token) => {
    expect(() => resolver.resolve(authContext(`Bearer ${token}`).context)).toThrow(InvalidAccessTokenException);
  });
});
