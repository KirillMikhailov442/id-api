import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { Email } from "@modules/user/domain/value-object/email.value-object";

describe("Email", () => {
  it("trims an email without changing its case", () => {
    expect(new Email("  User@Example.com  ").getValue()).toBe("User@Example.com");
  });

  it("accepts the maximum length", () => {
    const email = `${"a".repeat(116)}@example.com`;
    expect(new Email(email).getValue()).toBe(email);
  });

  it.each([
    "",
    "  ",
    "user",
    "user@example",
    "@example.com",
    "user@@example.com",
    "u ser@example.com",
    "user@exa mple.com",
    `${"a".repeat(117)}@example.com`,
    null,
    undefined,
    42,
    {},
  ])("rejects invalid email %p", (value) => {
    expect(() => new Email(value as string)).toThrow(InvalidValueObjectException);
  });
});
