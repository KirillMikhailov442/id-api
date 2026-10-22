import { InvalidValueObjectException } from "@shared/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

export const MIN_LENGTH = 2;
export const MAX_LENGTH = 64;

export class ClientName implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length < MIN_LENGTH) {
      throw new InvalidValueObjectException(`Client name must be at least ${MIN_LENGTH} characters`);
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Client name must be at most ${MAX_LENGTH} characters`);
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
