import { ConfigService } from "@nestjs/config";
import { securityNow } from "@shared/testing/security-test.spec-support";

import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { RefreshTokenService } from "@modules/session/infrastructure/security/token/refresh-token.service";

describe("RefreshTokenService", () => {
  const config = new ConfigService({ REFRESH_TOKEN_TTL: 3600 });
  const service = new RefreshTokenService(config);

  afterEach(() => jest.restoreAllMocks());

  it("issues independent 32-byte base64url secrets with a configured lifetime", async () => {
    jest.spyOn(Date, "now").mockReturnValue(securityNow.getTime());

    const first = await service.issue();
    const second = await service.issue();
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first.token, "base64url")).toHaveLength(32);
    expect(second.token).not.toBe(first.token);
    expect(first.expiresIn).toBe(3600);
    expect(first.expiresAt).toEqual(new Date(securityNow.getTime() + 3600_000));
  });

  it("hashes a known SHA-256 test vector without trimming or normalizing secrets", () => {
    const hash = service.hash("abc");
    expect(hash).toBeInstanceOf(RefreshHash);
    expect(hash.getValue()).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(service.hash("abc").getValue()).toBe(hash.getValue());
    expect(service.hash(" abc").getValue()).not.toBe(hash.getValue());
    expect(service.hash("ABC").getValue()).not.toBe(hash.getValue());
  });

  it("fails when the lifetime configuration is missing", async () => {
    const unconfigured = new RefreshTokenService(new ConfigService());
    await expect(unconfigured.issue()).rejects.toThrow();
  });
});
