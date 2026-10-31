import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const MAX_LENGTH = 255;

export const LOCATION_HREF_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/;

export class LocationHref implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Location href must not be empty");
    }

    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidValueObjectException(`Location href must be at most ${MAX_LENGTH} characters`);
    }

    if (!LOCATION_HREF_PATTERN.test(trimmed)) {
      throw new InvalidValueObjectException("Location href must be a valid absolute uri");
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
