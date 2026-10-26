import type { IRepository } from "@shared/domain/repository.type";

import type { Role } from "@modules/user/domain/entity/role";
import type { RoleName } from "@modules/user/domain/value-object/role-name.value-object";

export interface IRoleRepository extends IRepository<Role, string> {
  findAll(): Promise<Role[]>;
  findByIds(roleIds: string[]): Promise<Role[]>;
  findByName(name: RoleName): Promise<Role | null>;
}
