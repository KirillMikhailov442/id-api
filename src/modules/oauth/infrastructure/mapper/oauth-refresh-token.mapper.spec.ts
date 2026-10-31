import { DbOAuthRefreshToken } from "@modules/oauth/infrastructure/entity/db-oauth-refresh-token.entity";
import { OAuthRefreshTokenMapper } from "@modules/oauth/infrastructure/mapper/oauth-refresh-token.mapper";

describe("OAuthRefreshTokenMapper", () => {
  it.each([null, new Date("2026-02-01")])("preserves token lifecycle data with revokedAt=%p", (revokedAt) => {
    const id = "00000000-0000-4000-8000-000000000001";
    const otherId = "00000000-0000-4000-8000-000000000002";
    const date = new Date("2026-01-01");
    const stored = Object.assign(new DbOAuthRefreshToken(), {
      id,
      grantId: otherId,
      tokenHash: "a".repeat(64),
      createdAt: date,
      expiresAt: new Date("2027-01-01"),
      usedAt: revokedAt,
      revokedAt,
    });
    const domain = OAuthRefreshTokenMapper.toDomain(stored);

    expect(domain.id.getValue()).toBe(id);
    expect(domain.grantId.getValue()).toBe(otherId);
    expect(domain.revokedAt).toEqual(revokedAt);

    const result = OAuthRefreshTokenMapper.toPersistence(domain);

    expect(result).toBeInstanceOf(DbOAuthRefreshToken);
    expect(result).toEqual(stored);
    expect(result).not.toBe(stored);
  });
});
