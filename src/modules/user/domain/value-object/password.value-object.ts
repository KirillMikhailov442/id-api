import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { IValueObject } from "@shared/value-object/value-object.type";

export const PASSWORD_MIN_LENGTH = 2;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[\x21-\x7e]+$/;
export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must contain uppercase and lowercase Latin letters, a digit and a special character, using only printable ASCII characters without spaces";

export class Password implements IValueObject<string> {
  constructor(public readonly value: string) {
    if (typeof value !== "string") {
      throw new InvalidValueObjectException("Password must be a string");
    }

    if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
      throw new InvalidValueObjectException(
        `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`
      );
    }

    if (!PASSWORD_PATTERN.test(value)) {
      throw new InvalidValueObjectException(PASSWORD_REQUIREMENTS_MESSAGE);
    }
  }

  getValue(): string {
    return this.value;
  }
}
