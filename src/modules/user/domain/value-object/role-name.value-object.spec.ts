import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";

describe("RoleName", () => {
  it.each([2, 32])("accepts %i characters after trimming", (length) => {
    expect(new RoleName(`  ${"a".repeat(length)}  `).getValue()).toBe("a".repeat(length));
  });

  it.each(["", "   ", "a".repeat(1), "a".repeat(33), null, undefined, 42, {}])("rejects invalid input %p", (value) => {
    expect(() => new RoleName(value as string)).toThrow(InvalidValueObjectException);
  });
});
