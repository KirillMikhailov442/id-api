import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { ScopeMapper } from "@modules/oauth/infrastructure/mapper/scope.mapper";

describe("ScopeMapper", () => {
  it("restores typed domain values and preserves persisted fields", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const date = new Date("2026-01-01");
    const stored = Object.assign(new DbScope(), { id, name: "profile", createdAt: date });
    const domain = ScopeMapper.toDomain(stored);

    expect(domain.getName().getValue()).toBe("profile");

    const result = ScopeMapper.toPersistence(domain);

    expect(result).toBeInstanceOf(DbScope);
    expect(result).toEqual(stored);
    expect(result).not.toBe(stored);
  });
});
