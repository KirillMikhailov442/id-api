import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { Surname } from "@modules/user/domain/value-object/surname.value-object";

describe("Surname", () => {
  it.each([2, 64])("accepts %i characters after trimming", (length) => {
    expect(new Surname(`  ${"a".repeat(length)}  `).getValue()).toBe("a".repeat(length));
  });

  it.each(["", "   ", "a".repeat(1), "a".repeat(65), null, undefined, 42, {}])("rejects invalid input %p", (value) => {
    expect(() => new Surname(value as string)).toThrow(InvalidValueObjectException);
  });
});
