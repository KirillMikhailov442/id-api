import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";

describe("RefreshHash", () => {
  it.each([1, 255])("accepts %i characters after trimming", (length) => {
    expect(new RefreshHash(`  ${"a".repeat(length)}  `).getValue()).toBe("a".repeat(length));
  });

  it.each(["", "   ", "a".repeat(0), "a".repeat(256), null, undefined, 42, {}])("rejects invalid input %p", (value) => {
    expect(() => new RefreshHash(value as string)).toThrow(InvalidValueObjectException);
  });
});
