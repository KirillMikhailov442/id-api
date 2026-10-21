import { InjectRepository } from "@nestjs/typeorm";
import { In, QueryFailedError, type Repository } from "typeorm";

import type { IRoleRepository } from "@core/application/port/role-repository";
import type { Role } from "@core/domain/entity/role";
import { RoleAlreadyExistsException } from "@core/domain/exception/role-already-exists.exception";
import { RoleNotFoundException } from "@core/domain/exception/role-not-found.exception";
import type { RoleName } from "@core/domain/value-object/role-name.value-object";
import { DbRole } from "@core/infrastructure/entity/db-role.entity";
import { RoleMapper } from "@core/infrastructure/mapper/role.mapper";

const ROLES_NAME_UNIQUE_CONSTRAINT = "UQ_648e3f5447f725579d7d4ffdfb7";

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

  async findByIds(roleIds: string[]): Promise<Role[]> {
    if (roleIds.length === 0) {
      return [];
    }

    const dbRoles = await this.roleRepository.find({
      where: { id: In(roleIds) },
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

    try {
      await this.roleRepository.save(dbRole);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async delete(id: string): Promise<void> {
    const role = await this.findById(id);

    if (role === null) {
      throw new RoleNotFoundException();
    }

    await this.roleRepository.delete(id);
  }

  private mapError(error: unknown): Error {
    if (error instanceof QueryFailedError && (error as QueryFailedError & { code?: string }).code === "23505") {
      const constraint = (error as QueryFailedError & { constraint?: string }).constraint;

      if (constraint === ROLES_NAME_UNIQUE_CONSTRAINT) {
        return new RoleAlreadyExistsException();
      }
    }

    return error as Error;
  }
}
