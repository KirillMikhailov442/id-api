import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { Name } from "@modules/user/domain/value-object/name.value-object";

describe("Name", () => {
  it.each([2, 64])("accepts %i characters after trimming", (length) => {
    expect(new Name(`  ${"a".repeat(length)}  `).getValue()).toBe("a".repeat(length));
  });

  it.each(["", "   ", "a".repeat(1), "a".repeat(65), null, undefined, 42, {}])("rejects invalid input %p", (value) => {
    expect(() => new Name(value as string)).toThrow(InvalidValueObjectException);
  });
});
