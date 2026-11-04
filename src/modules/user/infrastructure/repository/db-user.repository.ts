import { InjectRepository } from "@nestjs/typeorm";
import type { PaginationQuery } from "@shared/pagination/pagination.query";
import { In, QueryFailedError, type Repository } from "typeorm";

import type { IUserRepository, UserFilter } from "@modules/user/application/port/user-repository";
import type { User } from "@modules/user/domain/entity/user";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import type { Email } from "@modules/user/domain/value-object/email.value-object";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { UserMapper } from "@modules/user/infrastructure/mapper/user.mapper";
import { UserId } from "@modules/user/user.ids";

const EMAIL_UNIQUE_CONSTRAINT = "users_email_key";

export class DbUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(DbUser)
    private readonly userRepository: Repository<DbUser>,
    @InjectRepository(DbUserRole)
    private readonly userRoleRepository: Repository<DbUserRole>
  ) {}

  async findById(id: UserId): Promise<User | null> {
    const dbUser = await this.userRepository.findOneBy({ id: id.getValue() });

    if (dbUser === null) {
      return null;
    }

    const dbUserRoles = await this.loadUserRoles(UserId.from(dbUser.id));

    return UserMapper.toDomain(dbUser, dbUserRoles);
  }

  async findAll(pagination: PaginationQuery, filter: UserFilter = {}): Promise<User[]> {
    const dbUsers = await this.filteredUsersQuery(filter)
      .skip(pagination.offset)
      .take(pagination.limit)
      .orderBy("user.createdAt", "DESC")
      .getMany();

    if (dbUsers.length === 0) {
      return [];
    }

    const userIds = dbUsers.map((dbUser) => dbUser.id);
    const dbUserRoles = await this.userRoleRepository.find({
      where: { userId: In(userIds) },
      relations: { role: true },
    });

    return dbUsers.map((dbUser) =>
      UserMapper.toDomain(
        dbUser,
        dbUserRoles.filter((dbUserRole) => dbUserRole.userId === dbUser.id)
      )
    );
  }

  async count(filter: UserFilter = {}): Promise<number> {
    return this.filteredUsersQuery(filter).getCount();
  }

  async findByEmail(email: Email): Promise<User | null> {
    const dbUser = await this.userRepository.findOneBy({
      email: email.getValue(),
    });

    if (dbUser === null) {
      return null;
    }

    const dbUserRoles = await this.loadUserRoles(UserId.from(dbUser.id));

    return UserMapper.toDomain(dbUser, dbUserRoles);
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { email: email.getValue() },
    });

    return count > 0;
  }

  async save(user: User): Promise<void> {
    const { user: dbUser } = UserMapper.toPersistence(user);

    try {
      await this.userRepository.save(dbUser);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async updatePassword(user: User, previousPasswordHash: string): Promise<boolean> {
    const result = await this.userRepository.update(
      { id: user.getId().getValue(), passwordHash: previousPasswordHash },
      { passwordHash: user.getPasswordHash(), updatedAt: user.getUpdatedAt() }
    );

    return result.affected === 1;
  }

  async delete(id: UserId): Promise<void> {
    const user = await this.findById(id);

    if (user === null) {
      throw new UserNotFoundException();
    }

    await this.userRepository.delete(id.getValue());
  }

  private filteredUsersQuery(filter: UserFilter) {
    const users = this.userRepository.createQueryBuilder("user");

    const search = filter.search?.trim() ?? "";

    if (search.length > 0) {
      const escapedSearch = search.replace(/[\\%_]/g, "\\$&");
      users.andWhere("(CONCAT_WS(' ', user.name, user.surname) ILIKE :search OR user.email ILIKE :search)", {
        search: `%${escapedSearch}%`,
      });
    }

    if (filter.excludeRole !== undefined) {
      users
        .andWhere((query) => {
          const assignments = query
            .subQuery()
            .select("1")
            .from(DbUserRole, "assignment")
            .innerJoin("assignment.role", "role")
            .where("assignment.userId = user.id")
            .andWhere("role.name = :hiddenRole")
            .getQuery();

          return `NOT EXISTS ${assignments}`;
        })
        .setParameter("hiddenRole", filter.excludeRole);
    }

    return users;
  }

  private async loadUserRoles(userId: UserId): Promise<DbUserRole[]> {
    return this.userRoleRepository.find({ where: { userId: userId.getValue() }, relations: { role: true } });
  }

  private mapError(error: unknown): Error {
    if (
      error instanceof QueryFailedError &&
      (
        error as QueryFailedError & {
          code?: string;
        }
      ).code === "23505"
    ) {
      const constraint = (
        error as QueryFailedError & {
          constraint?: string;
        }
      ).constraint;

      if (constraint === EMAIL_UNIQUE_CONSTRAINT || constraint === "UQ_97672ac88f789774dd47f7c8be3") {
        return new EmailAlreadyRegisteredException();
      }
    }

    return error as Error;
  }
}
