import type { PaginationQuery } from "@shared/pagination/pagination.query";
import type { IRepository } from "@shared/repository/repository.type";

import type { User } from "@modules/user/domain/entity/user";
import type { Email } from "@modules/user/domain/value-object/email.value-object";
import type { UserId } from "@modules/user/user.ids";

export interface UserFilter {
  excludeRole?: string;
}

export interface IUserRepository extends IRepository<User, UserId> {
  findAll(pagination: PaginationQuery, filter?: UserFilter): Promise<User[]>;
  count(filter?: UserFilter): Promise<number>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  updatePassword(user: User, previousPasswordHash: string): Promise<boolean>;
}
