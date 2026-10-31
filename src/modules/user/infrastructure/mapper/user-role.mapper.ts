import { UserRole } from "@modules/user/domain/entity/user-role";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { RoleId, UserId } from "@modules/user/user.ids";

export class UserRoleMapper {
  static toDomain(dbUserRole: DbUserRole): UserRole {
    return new UserRole(
      UserId.from(dbUserRole.userId),
      RoleId.from(dbUserRole.roleId),
      new RoleName(dbUserRole.role.name),
      dbUserRole.appointedAt
    );
  }

  static toPersistence(userRole: UserRole): DbUserRole {
    const dbUserRole = new DbUserRole();

    dbUserRole.userId = userRole.getUserId().getValue();
    dbUserRole.roleId = userRole.getRoleId().getValue();
    dbUserRole.appointedAt = userRole.getAppointedAt();

    return dbUserRole;
  }
}
