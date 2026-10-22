import { InvalidValueObjectException } from "@shared/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

export const MAX_LENGTH = 255;
export const CODE_HASH_PATTERN = /^[a-f0-9]{64}$/;

export class CodeHash implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    if (value.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Code hash must be at most ${MAX_LENGTH} characters`);
    }
    if (!CODE_HASH_PATTERN.test(value)) {
      throw new InvalidValueObjectException("Code hash must be a hex-encoded sha-256 digest");
    }

    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}
