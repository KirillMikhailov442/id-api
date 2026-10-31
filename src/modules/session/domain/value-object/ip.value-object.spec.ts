import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { Ip } from "@modules/session/domain/value-object/ip.value-object";

describe("Ip", () => {
  it.each(["127.0.0.1", "::1", "2001:db8::1", "::ffff:192.0.2.1", "unknown"])("accepts %s", (value) => {
    expect(new Ip(`  ${value}  `).getValue()).toBe(value);
  });

  it.each(["", "  ", "not-an-ip", "127.0.0.1:3000", "[::1]", "a".repeat(46), null, undefined, 42, {}])(
    "rejects invalid input %p",
    (value) => {
      expect(() => new Ip(value as string)).toThrow(InvalidValueObjectException);
    }
  );
});
