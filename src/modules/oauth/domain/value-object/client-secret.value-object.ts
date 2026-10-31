import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const CLIENT_SECRET_MIN_LENGTH = 12;
export const CLIENT_SECRET_MAX_LENGTH = 64;

export class ClientSecret implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Client secret must be a string");
    }

    if (value.length < CLIENT_SECRET_MIN_LENGTH) {
      throw new InvalidValueObjectException(`Client secret must be at least ${CLIENT_SECRET_MIN_LENGTH} characters`);
    }

    if (value.length > CLIENT_SECRET_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Client secret must be at most ${CLIENT_SECRET_MAX_LENGTH} characters`);
    }
  }

  getValue(): string {
    return this.value;
  }
}
