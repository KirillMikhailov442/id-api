import { InvalidValueObjectException } from "@modules/user/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

export const MIN_LENGTH = 2;
export const MAX_LENGTH = 64;

export class Surname implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Surname must not be empty");
    }
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Surname must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`);
    }
    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
