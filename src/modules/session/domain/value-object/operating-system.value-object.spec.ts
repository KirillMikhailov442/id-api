import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { OPERATING_SYSTEM_NAMES } from "@modules/session/domain/enum/operating-system.enum";
import { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";

describe("OperatingSystem", () => {
  it.each([...OPERATING_SYSTEM_NAMES])("accepts known value %s", (value) => {
    expect(OperatingSystem.isValid(value)).toBe(true);
    expect(new OperatingSystem(value).getValue()).toBe(value);
    expect(OperatingSystem.fromNullable(value)?.getValue()).toBe(value);
  });

  it.each(["", "unsupported-value", "a".repeat(129), null, undefined, 42, {}])(
    "rejects unknown input %p and safely maps it to null",
    (value) => {
      expect(OperatingSystem.isValid(value as string)).toBe(false);
      expect(() => new OperatingSystem(value as string)).toThrow(InvalidValueObjectException);
      expect(OperatingSystem.fromNullable(value as string | null | undefined)).toBeNull();
    }
  );
});
