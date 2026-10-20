import { InvalidValueObjectException } from "@core/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@core/shared/domain/value-object.type";

export const MAX_LENGTH = 128;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Email must not be empty");
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Email must be at most ${MAX_LENGTH} characters`);
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      throw new InvalidValueObjectException("Email must be a valid email address");
    }
    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
