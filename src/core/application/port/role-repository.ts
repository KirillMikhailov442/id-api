import type { Role } from "@core/domain/entity/role";
import type { RoleName } from "@core/domain/value-object/role-name.value-object";
import type { IRepository } from "@core/shared/domain/repository.type";

export interface IRoleRepository extends IRepository<Role, string> {
  findAll(): Promise<Role[]>;
  findByName(name: RoleName): Promise<Role | null>;
}
