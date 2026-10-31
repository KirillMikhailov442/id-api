import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";

describe("CodeScopes", () => {
  it("serializes scopes in their original order and returns independent arrays", () => {
    const input = ["openid", "profile:read", "email"];
    const scopes = new CodeScopes(input);
    input.push("admin");
    scopes.getItems().push("admin");
    expect(scopes.getValue()).toBe("openid profile:read email");
    expect(scopes.getItems()).toEqual(["openid", "profile:read", "email"]);
  });

  it("accepts a serialized length of 255 including separators", () => {
    const items = [...Array<string>(7).fill("a".repeat(32)), "b".repeat(24)];
    expect(new CodeScopes(items).getValue()).toHaveLength(255);
  });

  it.each([
    [],
    [""],
    ["a".repeat(33)],
    ["profile read"],
    [" profile"],
    ["профиль"],
    ["profile/read"],
    [...Array<string>(7).fill("a".repeat(32)), "b".repeat(25)],
    ["openid", 1],
    null,
    undefined,
    "openid",
    {},
  ])("rejects invalid scopes %p", (value) => {
    expect(() => new CodeScopes(value as string[])).toThrow(InvalidValueObjectException);
  });
});
