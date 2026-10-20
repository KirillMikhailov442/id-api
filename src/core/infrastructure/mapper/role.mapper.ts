import { Role } from "@core/domain/entity/role";
import { RoleName } from "@core/domain/value-object/role-name.value-object";
import { DbRole } from "@core/infrastructure/entity/db-role.entity";

export class RoleMapper {
  static toDomain(dbRole: DbRole): Role {
    return new Role(dbRole.id, new RoleName(dbRole.name), dbRole.createdAt);
  }

  static toPersistence(role: Role): DbRole {
    const dbRole = new DbRole();

    dbRole.id = role.getId();
    dbRole.name = role.getName().getValue();
    dbRole.createdAt = role.getCreatedAt();

    return dbRole;
  }
}
