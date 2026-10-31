import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";

describe("ScopeName", () => {
  it.each(["a", "a".repeat(32), "  profile:read_v2.test-1  "])("accepts and trims a scope", (value) => {
    expect(new ScopeName(value).getValue()).toBe(value.trim());
  });

  it.each(["", "  ", "a".repeat(33), "profile read", "profile/read", "profile*", "профиль", null, undefined, 42, {}])(
    "rejects invalid scope %p",
    (value) => {
      expect(() => new ScopeName(value as string)).toThrow(InvalidValueObjectException);
    }
  );
});
