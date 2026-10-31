import { DbOAuthGrant } from "@modules/oauth/infrastructure/entity/db-oauth-grant.entity";
import { OAuthGrantMapper } from "@modules/oauth/infrastructure/mapper/oauth-grant.mapper";

describe("OAuthGrantMapper", () => {
  it.each([null, new Date("2026-02-01")])("preserves token lifecycle data with revokedAt=%p", (revokedAt) => {
    const id = "00000000-0000-4000-8000-000000000001";
    const otherId = "00000000-0000-4000-8000-000000000002";
    const date = new Date("2026-01-01");
    const stored = Object.assign(new DbOAuthGrant(), {
      id,
      userId: otherId,
      clientId: id,
      scopes: ["openid", "profile"],
      audience: "https://api.example.com",
      createdAt: date,
      expiresAt: new Date("2027-01-01"),
      lastAccessExpiresAt: date,
      revokedAt,
    });
    const domain = OAuthGrantMapper.toDomain(stored);

    expect(domain.id.getValue()).toBe(id);
    expect(domain.userId.getValue()).toBe(otherId);
    expect(domain.clientId.getValue()).toBe(id);
    expect(domain.revokedAt).toEqual(revokedAt);

    const result = OAuthGrantMapper.toPersistence(domain);

    expect(result).toBeInstanceOf(DbOAuthGrant);
    expect(result).toEqual(stored);
    expect(result).not.toBe(stored);
  });
});
