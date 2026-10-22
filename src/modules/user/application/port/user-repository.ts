import type { User } from "@modules/user/domain/entity/user";
import type { Email } from "@modules/user/domain/value-object/email.value-object";
import type { IRepository } from "@shared/domain/repository.type";
import type { PaginationQuery } from "@shared/presentation/query/pagination.query";

export interface IUserRepository extends IRepository<User, string> {
  findAll(pagination: PaginationQuery): Promise<User[]>;
  count(): Promise<number>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
}
