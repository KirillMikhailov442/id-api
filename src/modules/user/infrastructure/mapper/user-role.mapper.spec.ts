import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { UserRoleMapper } from "@modules/user/infrastructure/mapper/user-role.mapper";

describe("UserRoleMapper", () => {
  it("reads the joined role name and persists only assignment fields", () => {
    const stored = Object.assign(new DbUserRole(), {
      userId: "00000000-0000-4000-8000-000000000001",
      roleId: "00000000-0000-4000-8000-000000000002",
      appointedAt: new Date("2026-01-01"),
      role: Object.assign(new DbRole(), { name: "admin" }),
    });
    const domain = UserRoleMapper.toDomain(stored);

    expect(domain.getRoleName().getValue()).toBe("admin");
    expect(domain.getUserId().getValue()).toBe(stored.userId);
    expect(domain.getRoleId().getValue()).toBe(stored.roleId);
    expect(UserRoleMapper.toPersistence(domain)).toEqual(
      Object.assign(new DbUserRole(), {
        userId: stored.userId,
        roleId: stored.roleId,
        appointedAt: stored.appointedAt,
      })
    );
  });
});
