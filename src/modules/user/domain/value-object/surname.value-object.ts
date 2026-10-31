import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const SURNAME_MIN_LENGTH = 2;
export const SURNAME_MAX_LENGTH = 64;

export class Surname implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Surname must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Surname must not be empty");
    }

    if (trimmed.length < SURNAME_MIN_LENGTH || trimmed.length > SURNAME_MAX_LENGTH) {
      throw new InvalidValueObjectException(
        `Surname must be between ${SURNAME_MIN_LENGTH} and ${SURNAME_MAX_LENGTH} characters`
      );
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
