import { InvalidValueObjectException } from "@shared/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

export const MIN_LENGTH = 12;
export const MAX_LENGTH = 64;

export class ClientSecret implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    if (value.length < MIN_LENGTH) {
      throw new InvalidValueObjectException(`Client secret must be at least ${MIN_LENGTH} characters`);
    }
    if (value.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Client secret must be at most ${MAX_LENGTH} characters`);
    }

    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}
