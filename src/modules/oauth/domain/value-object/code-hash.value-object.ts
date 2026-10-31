import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const CODE_HASH_MAX_LENGTH = 255;
export const CODE_HASH_PATTERN = /^[a-f0-9]{64}$/;

export class CodeHash implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Code hash must be a string");
    }

    if (value.length > CODE_HASH_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Code hash must be at most ${CODE_HASH_MAX_LENGTH} characters`);
    }

    if (!CODE_HASH_PATTERN.test(value)) {
      throw new InvalidValueObjectException("Code hash must be a hex-encoded sha-256 digest");
    }
  }

  getValue(): string {
    return this.value;
  }
}
