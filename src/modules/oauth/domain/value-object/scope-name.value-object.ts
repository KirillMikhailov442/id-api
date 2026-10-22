import { InvalidValueObjectException } from "@modules/user/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

export const MIN_LENGTH = 1;
export const MAX_LENGTH = 32;
export const SCOPE_NAME_PATTERN = /^[a-zA-Z0-9:_.-]+$/;

export class ScopeName implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length < MIN_LENGTH) {
      throw new InvalidValueObjectException("Scope name must not be empty");
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Scope name must be at most ${MAX_LENGTH} characters`);
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
