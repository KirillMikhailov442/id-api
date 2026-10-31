import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const NAME_MIN_LENGTH = 2;

export const NAME_MAX_LENGTH = 64;

export class Name implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Name must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Name must not be empty");
    }

    if (trimmed.length < NAME_MIN_LENGTH || trimmed.length > NAME_MAX_LENGTH) {
      throw new InvalidValueObjectException(
        `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`
      );
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
