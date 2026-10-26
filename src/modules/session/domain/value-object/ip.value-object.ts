import { InvalidValueObjectException } from "@shared/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

export const MAX_LENGTH = 45;

export const UNKNOWN = "unknown";

export const IP_PATTERN = /^(?:[0-9a-fA-F:]+(?:\.\d{1,3}){0,3}|unknown)$/;

export class Ip implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Ip must not be empty");
    }

    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Ip must be at most ${MAX_LENGTH} characters`);
    }

    if (!IP_PATTERN.test(trimmed)) {
      throw new InvalidValueObjectException("Ip must be a valid IPv4 or IPv6 address");
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
