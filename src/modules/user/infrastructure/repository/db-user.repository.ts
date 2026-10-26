import { InjectRepository } from "@nestjs/typeorm";
import type { PaginationQuery } from "@shared/presentation/query/pagination.query";
import { In, QueryFailedError, type Repository } from "typeorm";

import type { IUserRepository } from "@modules/user/application/port/user-repository";
import type { User } from "@modules/user/domain/entity/user";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import type { Email } from "@modules/user/domain/value-object/email.value-object";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { UserMapper } from "@modules/user/infrastructure/mapper/user.mapper";

const EMAIL_UNIQUE_CONSTRAINT = "users_email_key";

export class DbUserRepository implements IUserRepository {
  private readonly userRepository: Repository<DbUser>;
  private readonly userRoleRepository: Repository<DbUserRole>;

  constructor(
    @InjectRepository(DbUser)
    userRepository: Repository<DbUser>,
    @InjectRepository(DbUserRole)
    userRoleRepository: Repository<DbUserRole>
  ) {
    this.userRepository = userRepository;
    this.userRoleRepository = userRoleRepository;
  }

  async findById(id: string): Promise<User | null> {
    const dbUser = await this.userRepository.findOneBy({ id });

    if (dbUser === null) {
      return null;
    }

    const dbUserRoles = await this.loadUserRoles(dbUser.id);
    return UserMapper.toDomain(dbUser, dbUserRoles);
  }

  async findAll(pagination: PaginationQuery): Promise<User[]> {
    const dbUsers = await this.userRepository.find({
      skip: pagination.offset,
      take: pagination.limit,
      order: { createdAt: "DESC" },
    });

    if (dbUsers.length === 0) {
      return [];
    }

    const userIds = dbUsers.map((dbUser) => dbUser.id);
    const dbUserRoles = await this.userRoleRepository.find({
      where: { userId: In(userIds) },
    });
    return dbUsers.map((dbUser) =>
      UserMapper.toDomain(
        dbUser,
        dbUserRoles.filter((dbUserRole) => dbUserRole.userId === dbUser.id)
      )
    );
  }

  async count(): Promise<number> {
    return this.userRepository.count();
  }

  async findByEmail(email: Email): Promise<User | null> {
    const dbUser = await this.userRepository.findOneBy({
      email: email.getValue(),
    });

    if (dbUser === null) {
      return null;
    }

    const dbUserRoles = await this.loadUserRoles(dbUser.id);
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

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);

    if (user === null) {
      throw new UserNotFoundException();
    }

    await this.userRepository.delete(id);
  }

  private async loadUserRoles(userId: string): Promise<DbUserRole[]> {
    return this.userRoleRepository.find({ where: { userId } });
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

      if (constraint === EMAIL_UNIQUE_CONSTRAINT) {
        return new EmailAlreadyRegisteredException();
      }
    }

    return error as Error;
  }
}
