import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

import { DEVICE_TYPE_NAMES, type DeviceTypeName } from "@modules/session/domain/enum/device-type.enum";

export const DEVICE_TYPE_NAME_MAX_LENGTH = 128;

export class DeviceType implements IValueObject<DeviceTypeName> {
  readonly value: DeviceTypeName;

  constructor(value: string) {
    if (!DeviceType.isValid(value)) {
      throw new InvalidValueObjectException("Unknown device type name");
    }

    this.value = value;
  }

  static isValid(value: string): value is DeviceTypeName {
    return typeof value === "string" && value.length <= DEVICE_TYPE_NAME_MAX_LENGTH && DEVICE_TYPE_NAMES.has(value);
  }

  static fromNullable(value: string | null | undefined): DeviceType | null {
    return value !== null && value !== undefined && DeviceType.isValid(value) ? new DeviceType(value) : null;
  }

  getValue(): DeviceTypeName {
    return this.value;
  }
}
