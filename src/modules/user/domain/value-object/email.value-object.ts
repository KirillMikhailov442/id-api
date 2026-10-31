import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const EMAIL_MAX_LENGTH = 128;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Email must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Email must not be empty");
    }

    if (trimmed.length > EMAIL_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Email must be at most ${EMAIL_MAX_LENGTH} characters`);
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
