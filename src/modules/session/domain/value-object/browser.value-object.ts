import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

import { BROWSER_NAMES, type BrowserName } from "@modules/session/domain/enum/browser.enum";

export const BROWSER_NAME_MAX_LENGTH = 128;

export class Browser implements IValueObject<BrowserName> {
  readonly value: BrowserName;

  constructor(value: string) {
    if (!Browser.isValid(value)) {
      throw new InvalidValueObjectException("Unknown browser name");
    }

    this.value = value;
  }

  static isValid(value: string): value is BrowserName {
    return typeof value === "string" && value.length <= BROWSER_NAME_MAX_LENGTH && BROWSER_NAMES.has(value);
  }

  static fromNullable(value: string | null | undefined): Browser | null {
    return value !== null && value !== undefined && Browser.isValid(value) ? new Browser(value) : null;
  }

  getValue(): BrowserName {
    return this.value;
  }
}
