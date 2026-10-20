import { InvalidValueObjectException } from "@core/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@core/shared/domain/value-object.type";

export const MIN_LENGTH = 2;
export const MAX_LENGTH = 64;

export class Name implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Name must not be empty");
    }
    if (trimmed.length < MIN_LENGTH || trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Name must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`);
    }
    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
