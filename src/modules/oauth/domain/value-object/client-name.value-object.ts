import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const CLIENT_NAME_MIN_LENGTH = 2;
export const CLIENT_NAME_MAX_LENGTH = 64;

export class ClientName implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Client name must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length < CLIENT_NAME_MIN_LENGTH) {
      throw new InvalidValueObjectException(`Client name must be at least ${CLIENT_NAME_MIN_LENGTH} characters`);
    }

    if (trimmed.length > CLIENT_NAME_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Client name must be at most ${CLIENT_NAME_MAX_LENGTH} characters`);
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
