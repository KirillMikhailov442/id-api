import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { ClientScopeMapper } from "@modules/oauth/infrastructure/mapper/client-scope.mapper";

describe("ClientScopeMapper", () => {
  it("restores typed domain values and preserves persisted fields", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const otherId = "00000000-0000-4000-8000-000000000002";
    const date = new Date("2026-01-01");
    const stored = Object.assign(new DbClientScope(), { clientId: id, scopeId: otherId, assignedAt: date });
    const domain = ClientScopeMapper.toDomain(stored);

    expect(domain.getScopeId().getValue()).toBe(otherId);

    const result = ClientScopeMapper.toPersistence(domain);

    expect(result).toBeInstanceOf(DbClientScope);
    expect(result).toEqual(stored);
    expect(result).not.toBe(stored);
  });
});
