import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

import { OPERATING_SYSTEM_NAMES, type OperatingSystemName } from "@modules/session/domain/enum/operating-system.enum";

export const OPERATING_SYSTEM_NAME_MAX_LENGTH = 128;

export class OperatingSystem implements IValueObject<OperatingSystemName> {
  readonly value: OperatingSystemName;

  constructor(value: string) {
    if (!OperatingSystem.isValid(value)) {
      throw new InvalidValueObjectException("Unknown operating system name");
    }

    this.value = value;
  }

  static isValid(value: string): value is OperatingSystemName {
    return (
      typeof value === "string" && value.length <= OPERATING_SYSTEM_NAME_MAX_LENGTH && OPERATING_SYSTEM_NAMES.has(value)
    );
  }

  static fromNullable(value: string | null | undefined): OperatingSystem | null {
    return value !== null && value !== undefined && OperatingSystem.isValid(value) ? new OperatingSystem(value) : null;
  }

  getValue(): OperatingSystemName {
    return this.value;
  }
}
