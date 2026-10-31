import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";

describe("RedirectUri", () => {
  it.each([
    ["  HTTPS://EXAMPLE.COM:443/a/../callback  ", "https://example.com/callback"],
    ["https://example.com", "https://example.com/"],
    ["myapp://callback?code=1", "myapp://callback?code=1"],
    ["http://localhost:3000/callback", "http://localhost:3000/callback"],
  ])("normalizes %s", (input, expected) => {
    expect(new RedirectUri(input).getValue()).toBe(expected);
  });

  it("accepts an absolute URI of 255 characters", () => {
    const uri = `https://example.com/${"a".repeat(235)}`;
    expect(new RedirectUri(uri).getValue()).toBe(uri);
  });

  it("rejects a URI that exceeds the limit after URL encoding", () => {
    expect(() => new RedirectUri(`https://example.com/${"я".repeat(40)}`)).toThrow(InvalidValueObjectException);
  });

  it.each([
    "",
    "  ",
    "/callback",
    "//example.com/callback",
    "https://exa mple.com",
    "https://[invalid]",
    "https://",
    `https://example.com/${"a".repeat(236)}`,
    null,
    undefined,
    42,
    {},
  ])("rejects invalid URI %p", (value) => {
    expect(() => new RedirectUri(value as string)).toThrow(InvalidValueObjectException);
  });
});
