import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const ROLE_NAME_MIN_LENGTH = 2;
export const ROLE_NAME_MAX_LENGTH = 32;

export class RoleName implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Role name must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Role name must not be empty");
    }

    if (trimmed.length < ROLE_NAME_MIN_LENGTH || trimmed.length > ROLE_NAME_MAX_LENGTH) {
      throw new InvalidValueObjectException(
        `Role name must be between ${ROLE_NAME_MIN_LENGTH} and ${ROLE_NAME_MAX_LENGTH} characters`
      );
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
