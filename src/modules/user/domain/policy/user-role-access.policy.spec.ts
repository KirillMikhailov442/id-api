import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserRoleChangeForbiddenException } from "@modules/user/domain/exception/user-role-change-forbidden.exception";
import { assertUserRoleChangeAllowed } from "@modules/user/domain/policy/user-role-access.policy";

describe("User role access policy", () => {
  it.each([
    { roles: [RoleType.Admin], action: "assign" as const },
    { roles: [RoleType.SuperUser], action: "assign" as const },
    { roles: [RoleType.SuperUser], action: "remove" as const },
    { roles: [RoleType.Admin, RoleType.SuperUser], action: "remove" as const },
  ])("allows $roles to $action", ({ roles, action }) => {
    expect(() => assertUserRoleChangeAllowed(roles, action)).not.toThrow();
  });

  for (const action of ["assign", "remove"] as const) {
    it.each([[], [RoleType.User], ["admin"], ["superuser"]].map((roles) => ({ roles })))(
      `rejects $roles for ${action}`,
      ({ roles }) => {
        expect(() => assertUserRoleChangeAllowed(roles, action)).toThrow(UserRoleChangeForbiddenException);
      }
    );
  }

  it("forbids an ADMIN from demoting another ADMIN or itself", () => {
    expect(() => assertUserRoleChangeAllowed([RoleType.Admin], "remove")).toThrow(UserRoleChangeForbiddenException);
  });
});
