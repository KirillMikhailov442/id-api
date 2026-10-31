import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";

describe("ClientName", () => {
  it.each([2, 64])("accepts %i characters after trimming", (length) => {
    expect(new ClientName(`  ${"a".repeat(length)}  `).getValue()).toBe("a".repeat(length));
  });

  it.each(["", "   ", "a".repeat(1), "a".repeat(65), null, undefined, 42, {}])("rejects invalid input %p", (value) => {
    expect(() => new ClientName(value as string)).toThrow(InvalidValueObjectException);
  });
});
