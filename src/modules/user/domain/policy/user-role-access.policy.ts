import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserRoleChangeForbiddenException } from "@modules/user/domain/exception/user-role-change-forbidden.exception";

export function assertUserRoleChangeAllowed(requesterRoles: readonly string[], action: "assign" | "remove"): void {
  const isSuperUser = requesterRoles.includes(RoleType.SuperUser);

  if (!isSuperUser && !requesterRoles.includes(RoleType.Admin)) {
    throw new UserRoleChangeForbiddenException("Only ADMIN or SUPERUSER can manage user roles");
  }

  if (action === "remove" && !isSuperUser) {
    throw new UserRoleChangeForbiddenException("Only SUPERUSER can demote an ADMIN");
  }
}
