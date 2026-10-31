import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const LOCATION_HREF_MAX_LENGTH = 255;
export const LOCATION_HREF_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/;

export class LocationHref implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Location href must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Location href must not be empty");
    }

    if (trimmed.length > LOCATION_HREF_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Location href must be at most ${LOCATION_HREF_MAX_LENGTH} characters`);
    }

    if (!LOCATION_HREF_PATTERN.test(trimmed)) {
      throw new InvalidValueObjectException("Location href must be a valid absolute uri");
    }

    let normalized: string;

    try {
      normalized = new URL(trimmed).href;
    } catch {
      throw new InvalidValueObjectException("Location href must be a valid absolute uri");
    }

    if (normalized.length > LOCATION_HREF_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Location href must be at most ${LOCATION_HREF_MAX_LENGTH} characters`);
    }

    this.value = normalized;
  }

  getValue(): string {
    return this.value;
  }
}
