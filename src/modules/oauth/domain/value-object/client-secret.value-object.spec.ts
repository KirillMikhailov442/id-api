import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { ClientSecret } from "@modules/oauth/domain/value-object/client-secret.value-object";

describe("ClientSecret", () => {
  it.each(["a".repeat(12), "a".repeat(64), "  secret value  "])("preserves the secret verbatim", (value) => {
    expect(new ClientSecret(value).getValue()).toBe(value);
  });

  it.each(["", "a".repeat(11), "a".repeat(65), null, undefined, 42, {}])("rejects invalid secret %p", (value) => {
    expect(() => new ClientSecret(value as string)).toThrow(InvalidValueObjectException);
  });
});
