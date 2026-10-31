import type { IRepository } from "@shared/repository/repository.type";

import type { Role } from "@modules/user/domain/entity/role";
import type { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import type { RoleId } from "@modules/user/user.ids";

export interface IRoleRepository extends IRepository<Role, RoleId> {
  findAll(): Promise<Role[]>;
  findByIds(roleIds: RoleId[]): Promise<Role[]>;
  findByName(name: RoleName): Promise<Role | null>;
}
