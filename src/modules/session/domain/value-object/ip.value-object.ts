import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const IP_MAX_LENGTH = 45;

export const UNKNOWN = "unknown";

export const IP_PATTERN = /^(?:[0-9a-fA-F:]+(?:\.\d{1,3}){0,3}|unknown)$/;

export class Ip implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Ip must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Ip must not be empty");
    }

    if (trimmed.length > IP_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Ip must be at most ${IP_MAX_LENGTH} characters`);
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
