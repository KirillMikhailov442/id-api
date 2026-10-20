import { UserRole } from "@core/domain/entity/user-role";
import { DbUserRole } from "@core/infrastructure/entity/db-user-role.entity";

export class UserRoleMapper {
  static toDomain(dbUserRole: DbUserRole): UserRole {
    return new UserRole(dbUserRole.userId, dbUserRole.roleId, dbUserRole.appointedAt);
  }

  static toPersistence(userRole: UserRole): DbUserRole {
    const dbUserRole = new DbUserRole();

    dbUserRole.userId = userRole.getUserId();
    dbUserRole.roleId = userRole.getRoleId();
    dbUserRole.appointedAt = userRole.getAppointedAt();

    return dbUserRole;
  }
}
