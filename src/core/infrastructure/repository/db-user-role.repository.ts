import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type { IUserRoleRepository } from "@core/application/port/user-role-repository";
import type { Role } from "@core/domain/entity/role";
import type { UserRole } from "@core/domain/entity/user-role";
import { DbRole } from "@core/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@core/infrastructure/entity/db-user-role.entity";
import { RoleMapper } from "@core/infrastructure/mapper/role.mapper";
import { UserRoleMapper } from "@core/infrastructure/mapper/user-role.mapper";

export class DbUserRoleRepository implements IUserRoleRepository {
  constructor(
    @InjectRepository(DbUserRole) private readonly userRoleRepository: Repository<DbUserRole>,
    @InjectRepository(DbRole) private readonly roleRepository: Repository<DbRole>
  ) {}

  async save(userRole: UserRole): Promise<void> {
    const dbUserRole = UserRoleMapper.toPersistence(userRole);

    await this.userRoleRepository.save(dbUserRole);
  }

  async existsByUserIdAndRoleId(userId: string, roleId: string): Promise<boolean> {
    const count = await this.userRoleRepository.count({
      where: { userId, roleId },
    });

    return count > 0;
  }

  async findByUserId(userId: string): Promise<Role[]> {
    const dbRoles = await this.roleRepository
      .createQueryBuilder("role")
      .innerJoin(DbUserRole, "userRole", "userRole.roleId = role.id")
      .where("userRole.userId = :userId", { userId })
      .orderBy("userRole.appointedAt", "ASC")
      .getMany();

    return dbRoles.map(RoleMapper.toDomain);
  }

  async delete(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepository.delete({ userId, roleId });
  }
}
