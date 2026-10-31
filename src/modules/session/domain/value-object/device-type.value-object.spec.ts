import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { DEVICE_TYPE_NAMES } from "@modules/session/domain/enum/device-type.enum";
import { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";

describe("DeviceType", () => {
  it.each([...DEVICE_TYPE_NAMES])("accepts known value %s", (value) => {
    expect(DeviceType.isValid(value)).toBe(true);
    expect(new DeviceType(value).getValue()).toBe(value);
    expect(DeviceType.fromNullable(value)?.getValue()).toBe(value);
  });

  it.each(["", "unsupported-value", "a".repeat(129), null, undefined, 42, {}])(
    "rejects unknown input %p and safely maps it to null",
    (value) => {
      expect(DeviceType.isValid(value as string)).toBe(false);
      expect(() => new DeviceType(value as string)).toThrow(InvalidValueObjectException);
      expect(DeviceType.fromNullable(value as string | null | undefined)).toBeNull();
    }
  );
});
