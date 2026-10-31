import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";

import type { IUserRoleRepository } from "@modules/user/application/port/user-role-repository";
import type { Role } from "@modules/user/domain/entity/role";
import type { UserRole } from "@modules/user/domain/entity/user-role";
import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { RoleMapper } from "@modules/user/infrastructure/mapper/role.mapper";
import { UserRoleMapper } from "@modules/user/infrastructure/mapper/user-role.mapper";
import { RoleId, UserId } from "@modules/user/user.ids";

export class DbUserRoleRepository implements IUserRoleRepository {
  constructor(
    @InjectRepository(DbUserRole)
    private readonly userRoleRepository: Repository<DbUserRole>,
    @InjectRepository(DbRole)
    private readonly roleRepository: Repository<DbRole>
  ) {}

  async save(userRole: UserRole): Promise<void> {
    const dbUserRole = UserRoleMapper.toPersistence(userRole);
    await this.userRoleRepository.save(dbUserRole);
  }

  async existsByUserIdAndRoleId(userId: UserId, roleId: RoleId): Promise<boolean> {
    const count = await this.userRoleRepository.count({
      where: { userId: userId.getValue(), roleId: roleId.getValue() },
    });

    return count > 0;
  }

  async findByUserId(userId: UserId): Promise<Role[]> {
    const dbRoles = await this.roleRepository
      .createQueryBuilder("role")
      .innerJoin(DbUserRole, "userRole", "userRole.roleId = role.id")
      .where("userRole.userId = :userId", { userId: userId.getValue() })
      .orderBy("userRole.appointedAt", "ASC")
      .getMany();

    return dbRoles.map(RoleMapper.toDomain);
  }

  async delete(userId: UserId, roleId: RoleId): Promise<void> {
    await this.userRoleRepository.delete({ userId: userId.getValue(), roleId: roleId.getValue() });
  }
}
