import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { Password } from "@modules/user/domain/value-object/password.value-object";

describe("Password", () => {
  it.each(["Aa1!", `Aa1!${"a".repeat(60)}`])("preserves a valid password", (value) => {
    expect(new Password(value).getValue()).toBe(value);
  });

  it.each([
    "",
    "A",
    "Aa1",
    "aa1!",
    "AA1!",
    "Aaa!",
    "Aaa1",
    " Aa1!",
    "Aa1! ",
    "Aa1!\n",
    "Aa1!\t",
    "Aa1!я",
    "Aa1!😀",
    `Aa1!${"a".repeat(61)}`,
    null,
    undefined,
    42,
    {},
  ])("rejects invalid password %p", (value) => {
    expect(() => new Password(value as string)).toThrow(InvalidValueObjectException);
  });
});
