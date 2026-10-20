import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type { IRoleRepository } from "@core/application/port/role-repository";
import type { Role } from "@core/domain/entity/role";
import { RoleNotFoundException } from "@core/domain/exception/role-not-found.exception";
import type { RoleName } from "@core/domain/value-object/role-name.value-object";
import { DbRole } from "@core/infrastructure/entity/db-role.entity";
import { RoleMapper } from "@core/infrastructure/mapper/role.mapper";

export class DbRoleRepository implements IRoleRepository {
  constructor(@InjectRepository(DbRole) private readonly roleRepository: Repository<DbRole>) {}

  async findById(id: string): Promise<Role | null> {
    const dbRole = await this.roleRepository.findOneBy({ id });

    if (dbRole === null) {
      return null;
    }

    return RoleMapper.toDomain(dbRole);
  }

  async findAll(): Promise<Role[]> {
    const dbRoles = await this.roleRepository.find({
      order: { createdAt: "ASC" },
    });

    return dbRoles.map(RoleMapper.toDomain);
  }

  async findByName(name: RoleName): Promise<Role | null> {
    const dbRole = await this.roleRepository.findOneBy({
      name: name.getValue(),
    });

    if (dbRole === null) {
      return null;
    }

    return RoleMapper.toDomain(dbRole);
  }

  async save(role: Role): Promise<void> {
    const dbRole = RoleMapper.toPersistence(role);

    await this.roleRepository.save(dbRole);
  }

  async delete(id: string): Promise<void> {
    const role = await this.findById(id);

    if (role === null) {
      throw new RoleNotFoundException();
    }

    await this.roleRepository.delete(id);
  }
}
