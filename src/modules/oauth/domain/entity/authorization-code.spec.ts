import { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { AuthorizationCodeAlreadyUsedException } from "@modules/oauth/domain/exception/authorization-code-already-used.exception";
import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { ClientId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

describe("AuthorizationCode", () => {
  let code: AuthorizationCode;
  const now = new Date("2026-01-01T00:00:00Z");
  const expiresAt = new Date("2026-01-01T00:05:00Z");

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    code = AuthorizationCode.create({
      clientId: ClientId.create(),
      userId: UserId.create(),
      codeHash: new CodeHash("a".repeat(64)),
      scopes: new CodeScopes(["openid"]),
      redirectUri: new RedirectUri("https://example.com/callback"),
      expiresAt,
    });
  });

  afterEach(() => jest.useRealTimers());

  it("creates an unused code and allows consuming it only once", () => {
    expect(code.getIsUsed()).toBe(false);
    code.markUsed();
    expect(code.getIsUsed()).toBe(true);
    expect(() => code.markUsed()).toThrow(AuthorizationCodeAlreadyUsedException);
    expect(code.getIsUsed()).toBe(true);
  });

  it.each([
    [-1, false],
    [0, true],
    [1, true],
  ])("checks expiry at a %i ms offset", (offset, expired) => {
    const time = new Date(expiresAt.getTime() + offset);
    expect(code.isExpired(time)).toBe(expired);
    jest.setSystemTime(time);
    expect(code.isExpired()).toBe(expired);
  });

  it("protects creation and expiry dates returned to callers", () => {
    code.getCreatedAt().setFullYear(2000);
    code.getExpiresAt().setFullYear(2000);
    expect(code.getCreatedAt()).toEqual(now);
    expect(code.getExpiresAt()).toEqual(expiresAt);
  });
});
