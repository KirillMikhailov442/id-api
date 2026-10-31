import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { RoleMapper } from "@modules/user/infrastructure/mapper/role.mapper";

describe("RoleMapper", () => {
  it("restores typed domain values and preserves persisted fields", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const date = new Date("2026-01-01");
    const stored = Object.assign(new DbRole(), { id, name: "admin", createdAt: date });
    const domain = RoleMapper.toDomain(stored);

    expect(domain.getName().getValue()).toBe("admin");

    const result = RoleMapper.toPersistence(domain);

    expect(result).toBeInstanceOf(DbRole);
    expect(result).toEqual(stored);
    expect(result).not.toBe(stored);
  });
});
