import type { PaginationQuery } from "@shared/pagination/pagination.query";
import type { IRepository } from "@shared/repository/repository.type";

import type { Client } from "@modules/oauth/domain/entity/client";
import type { ClientId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export interface IClientRepository extends IRepository<Client, ClientId> {
  findByIdForUpdate(id: ClientId): Promise<Client | null>;
  findByUserId(userId: UserId, pagination: PaginationQuery, search?: string): Promise<Client[]>;
  findAll(pagination: PaginationQuery, search?: string): Promise<Client[]>;
  count(search?: string): Promise<number>;
  countByUserId(userId: UserId, search?: string): Promise<number>;
}
