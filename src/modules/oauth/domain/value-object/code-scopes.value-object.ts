import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

import { SCOPE_NAME_MAX_LENGTH, SCOPE_NAME_PATTERN } from "@modules/oauth/domain/value-object/scope-name.value-object";

export const CODE_SCOPES_MAX_LENGTH = 255;
export const SCOPE_SEPARATOR = " ";
export const MIN_SCOPES_COUNT = 1;

export class CodeScopes implements IValueObject<string> {
  readonly value: string;

  constructor(items: string[]) {
    if (!Array.isArray(items) || items.some((item) => typeof item !== "string")) {
      throw new InvalidValueObjectException("Scopes must be an array of strings");
    }

    if (items.length < MIN_SCOPES_COUNT) {
      throw new InvalidValueObjectException(`Scopes must contain at least ${MIN_SCOPES_COUNT} scope`);
    }

    if (items.some((item) => item.length === 0 || item.length > SCOPE_NAME_MAX_LENGTH)) {
      throw new InvalidValueObjectException(`Each scope must be between 1 and ${SCOPE_NAME_MAX_LENGTH} characters`);
    }

    if (items.some((item) => !SCOPE_NAME_PATTERN.test(item))) {
      throw new InvalidValueObjectException(
        "Each scope must contain only latin letters, digits and ':', '_', '.', '-' characters"
      );
    }

    const joined = items.join(SCOPE_SEPARATOR);

    if (joined.length > CODE_SCOPES_MAX_LENGTH) {
      throw new InvalidValueObjectException(`Scopes must be at most ${CODE_SCOPES_MAX_LENGTH} characters`);
    }

    this.value = joined;
  }

  getValue(): string {
    return this.value;
  }

  getItems(): string[] {
    return this.value.split(SCOPE_SEPARATOR);
  }
}
