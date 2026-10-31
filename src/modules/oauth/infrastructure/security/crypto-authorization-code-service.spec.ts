import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { CryptoAuthorizationCodeService } from "@modules/oauth/infrastructure/security/crypto-authorization-code-service";

describe("CryptoAuthorizationCodeService", () => {
  const service = new CryptoAuthorizationCodeService();

  it("generates independent 32-byte URL-safe codes", () => {
    const first = service.generate();
    const second = service.generate();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first, "base64url")).toHaveLength(32);
    expect(second).not.toBe(first);
  });

  it("returns the known SHA-256 digest as a CodeHash", () => {
    const hash = service.hash("abc");
    expect(hash).toBeInstanceOf(CodeHash);
    expect(hash.getValue()).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(service.hash("abc").getValue()).toBe(hash.getValue());
    expect(service.hash(" abc").getValue()).not.toBe(hash.getValue());
    expect(service.hash("ABC").getValue()).not.toBe(hash.getValue());
  });
});
