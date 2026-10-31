import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

import {
  LOCATION_HREF_MAX_LENGTH,
  LOCATION_HREF_PATTERN,
  LocationHref,
} from "@modules/oauth/domain/value-object/location-href.value-object";

export const REDIRECT_URI_MAX_LENGTH = 255;
export const REDIRECT_URI_PATTERN = LOCATION_HREF_PATTERN;

export class RedirectUri implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Redirect uri must be a string");
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Redirect uri must not be empty");
    }

    if (trimmed.length > LOCATION_HREF_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Redirect uri must be at most ${LOCATION_HREF_MAX_LENGTH} characters`);
    }

    if (!LOCATION_HREF_PATTERN.test(trimmed)) {
      throw new InvalidValueObjectException("Redirect uri must be a valid absolute uri");
    }

    this.value = new LocationHref(trimmed).getValue();
  }

  getValue(): string {
    return this.value;
  }
}
