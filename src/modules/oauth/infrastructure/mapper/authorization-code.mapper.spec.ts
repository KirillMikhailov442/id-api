import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";
import { AuthorizationCodeMapper } from "@modules/oauth/infrastructure/mapper/authorization-code.mapper";

describe("AuthorizationCodeMapper", () => {
  it("restores typed domain values and preserves persisted fields", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const otherId = "00000000-0000-4000-8000-000000000002";
    const date = new Date("2026-01-01");
    const stored = Object.assign(new DbAuthorizationCode(), {
      id,
      clientId: otherId,
      userId: id,
      codeHash: "a".repeat(64),
      scopes: "openid profile",
      redirectUri: "https://app.example.com/callback",
      isUsed: true,
      createdAt: date,
      expiresAt: new Date("2027-01-01"),
    });
    const domain = AuthorizationCodeMapper.toDomain(stored);

    expect(domain.getScopes().getValue()).toBe("openid profile");
    expect(domain.getIsUsed()).toBe(true);

    const result = AuthorizationCodeMapper.toPersistence(domain);

    expect(result).toBeInstanceOf(DbAuthorizationCode);
    expect(result).toEqual(stored);
    expect(result).not.toBe(stored);
  });
});
