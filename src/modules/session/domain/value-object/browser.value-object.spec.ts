import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { BROWSER_NAMES } from "@modules/session/domain/enum/browser.enum";
import { Browser } from "@modules/session/domain/value-object/browser.value-object";

describe("Browser", () => {
  it.each([...BROWSER_NAMES])("accepts known value %s", (value) => {
    expect(Browser.isValid(value)).toBe(true);
    expect(new Browser(value).getValue()).toBe(value);
    expect(Browser.fromNullable(value)?.getValue()).toBe(value);
  });

  it.each(["", "unsupported-value", "a".repeat(129), null, undefined, 42, {}])(
    "rejects unknown input %p and safely maps it to null",
    (value) => {
      expect(Browser.isValid(value as string)).toBe(false);
      expect(() => new Browser(value as string)).toThrow(InvalidValueObjectException);
      expect(Browser.fromNullable(value as string | null | undefined)).toBeNull();
    }
  );
});
