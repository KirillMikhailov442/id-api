import type { User } from "@core/domain/entity/user";
import type { Email } from "@core/domain/value-object/email.value-object";
import type { IRepository } from "@core/shared/domain/repository.type";
import type { PaginationQuery } from "@core/shared/presentation/query/pagination.query";

export interface IUserRepository extends IRepository<User, string> {
  findAll(pagination: PaginationQuery): Promise<User[]>;
  count(): Promise<number>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
}
