import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const REFRESH_HASH_MAX_LENGTH = 255;

export class RefreshHash implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Refresh hash must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Refresh hash must not be empty");
    }

    if (trimmed.length > REFRESH_HASH_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Refresh hash must be at most ${REFRESH_HASH_MAX_LENGTH} characters`);
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
