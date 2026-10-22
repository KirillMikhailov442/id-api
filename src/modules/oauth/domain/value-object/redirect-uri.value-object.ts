import { InvalidValueObjectException } from "@shared/domain/exception/invalid-value-object.exception";
import type { IValueObject } from "@shared/domain/value-object.type";

import {
  MAX_LENGTH as HREF_MAX_LENGTH,
  LOCATION_HREF_PATTERN,
} from "@modules/oauth/domain/value-object/location-href.value-object";

export const MAX_LENGTH = 255;
export const REDIRECT_URI_PATTERN = LOCATION_HREF_PATTERN;

export class RedirectUri implements IValueObject<string> {
  readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new InvalidValueObjectException("Redirect uri must not be empty");
    }
    if (trimmed.length > HREF_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Redirect uri must be at most ${HREF_MAX_LENGTH} characters`);
    }
    if (!LOCATION_HREF_PATTERN.test(trimmed)) {
      throw new InvalidValueObjectException("Redirect uri must be a valid absolute uri");
    }

    this.value = trimmed;
  }

  getValue(): string {
    return this.value;
  }
}
