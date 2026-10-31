import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";

describe("CodeHash", () => {
  it("accepts a lowercase hexadecimal SHA-256 digest", () => {
    const digest = "0123456789abcdef".repeat(4);
    expect(new CodeHash(digest).getValue()).toBe(digest);
  });

  it.each([
    "",
    "a".repeat(63),
    "a".repeat(65),
    "a".repeat(256),
    "A".repeat(64),
    "g".repeat(64),
    ` ${"a".repeat(64)}`,
    null,
    undefined,
    42,
    {},
  ])("rejects invalid digest %p", (value) => {
    expect(() => new CodeHash(value as string)).toThrow(InvalidValueObjectException);
  });
});
