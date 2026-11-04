import { InjectRepository } from "@nestjs/typeorm";
import type { PaginationQuery } from "@shared/pagination/pagination.query";
import type { Repository, SelectQueryBuilder } from "typeorm";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { ClientMapper } from "@modules/oauth/infrastructure/mapper/client.mapper";
import { ClientId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

export class DbClientRepository implements IClientRepository {
  constructor(
    @InjectRepository(DbClient)
    private readonly repository: Repository<DbClient>
  ) {}

  async findById(id: ClientId): Promise<Client | null> {
    const dbClient = await this.withScopes(this.repository.createQueryBuilder("client"))
      .where("client.id = :id", { id: id.getValue() })
      .getOne();

    if (dbClient === null) {
      return null;
    }

    return ClientMapper.toDomain(dbClient);
  }

  async findByIdForUpdate(id: ClientId): Promise<Client | null> {
    const dbClient = await this.repository.findOne({
      where: { id: id.getValue() },
      lock: { mode: "pessimistic_write" },
    });

    return dbClient === null ? null : ClientMapper.toDomain(dbClient);
  }

  async findByUserId(userId: UserId, pagination: PaginationQuery): Promise<Client[]> {
    const dbClients = await this.withScopes(this.repository.createQueryBuilder("client"))
      .where("client.userId = :userId", { userId: userId.getValue() })
      .skip(pagination.offset)
      .take(pagination.limit)
      .orderBy("client.createdAt", "DESC")
      .addOrderBy("client.id", "DESC")
      .getMany();

    return dbClients.map(ClientMapper.toDomain);
  }

  async findAll(pagination: PaginationQuery): Promise<Client[]> {
    const dbClients = await this.withScopes(this.repository.createQueryBuilder("client"))
      .skip(pagination.offset)
      .take(pagination.limit)
      .orderBy("client.createdAt", "DESC")
      .addOrderBy("client.id", "DESC")
      .getMany();

    return dbClients.map(ClientMapper.toDomain);
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async countByUserId(userId: UserId): Promise<number> {
    return this.repository.count({ where: { userId: userId.getValue() } });
  }

  async save(client: Client): Promise<void> {
    const dbClient = ClientMapper.toPersistence(client);
    await this.repository.save(dbClient);
  }

  async delete(id: ClientId): Promise<void> {
    await this.repository.delete(id.getValue());
  }

  private withScopes(query: SelectQueryBuilder<DbClient>) {
    return query
      .leftJoin(DbClientScope, "assignment", "assignment.clientId = client.id")
      .leftJoinAndMapMany("client.scopes", DbScope, "scope", "scope.id = assignment.scopeId");
  }
}
