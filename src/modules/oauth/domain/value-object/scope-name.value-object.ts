import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const SCOPE_NAME_MIN_LENGTH = 1;

export const SCOPE_NAME_MAX_LENGTH = 32;

export const SCOPE_NAME_PATTERN = /^[a-zA-Z0-9:_.-]+$/;

export class ScopeName implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Scope name must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length < SCOPE_NAME_MIN_LENGTH) {
      throw new InvalidValueObjectException("Scope name must not be empty");
    }

    if (trimmed.length > SCOPE_NAME_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Scope name must be at most ${SCOPE_NAME_MAX_LENGTH} characters`);
    }

    if (!SCOPE_NAME_PATTERN.test(trimmed)) {
      throw new InvalidValueObjectException(
        "Scope name must contain only latin letters, digits and ':', '_', '.', '-' characters"
      );
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
