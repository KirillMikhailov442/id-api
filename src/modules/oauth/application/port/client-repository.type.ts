import type { Client } from "@modules/oauth/domain/entity/client";

import type { IRepository } from "@core/shared/domain/repository.type";
import type { PaginationQuery } from "@core/shared/presentation/query/pagination.query";

export interface IClientRepository extends IRepository<Client, string> {
  findByUserId(userId: string, pagination: PaginationQuery): Promise<Client[]>;
  findAll(pagination: PaginationQuery): Promise<Client[]>;
  count(): Promise<number>;
  countByUserId(userId: string): Promise<number>;
}
