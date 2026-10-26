import { InvalidValueObjectException } from "@shared/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

export const MAX_LENGTH = 255;

export class UserAgent implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("User agent must not be empty");
    }

    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`User agent must be at most ${MAX_LENGTH} characters`);
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
