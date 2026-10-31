import { UserRole } from "@modules/user/domain/entity/user-role";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { RoleId, UserId } from "@modules/user/user.ids";

describe("UserRole", () => {
  it("preserves assignment data and protects its timestamp from getter mutations", () => {
    const date = new Date("2026-01-01");
    const entity = new UserRole(UserId.create(), RoleId.create(), new RoleName("admin"), date);

    expect(entity.getRoleName().getValue()).toBe("admin");
    expect(entity.getAppointedAt()).toEqual(date);
    entity.getAppointedAt().setFullYear(2000);
    expect(entity.getAppointedAt()).toEqual(date);
  });
});
