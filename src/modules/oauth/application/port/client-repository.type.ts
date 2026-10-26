import type { IRepository } from "@shared/domain/repository.type";
import type { PaginationQuery } from "@shared/presentation/query/pagination.query";

import type { Client } from "@modules/oauth/domain/entity/client";

export interface IClientRepository extends IRepository<Client, string> {
  findByUserId(userId: string, pagination: PaginationQuery): Promise<Client[]>;
  findAll(pagination: PaginationQuery): Promise<Client[]>;
  count(): Promise<number>;
  countByUserId(userId: string): Promise<number>;
}
