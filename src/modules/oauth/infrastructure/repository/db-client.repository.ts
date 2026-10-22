import { InjectRepository } from "@nestjs/typeorm";
import type { PaginationQuery } from "@shared/presentation/query/pagination.query";
import type { Repository } from "typeorm";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { ClientMapper } from "@modules/oauth/infrastructure/mapper/client.mapper";

export class DbClientRepository implements IClientRepository {
  constructor(@InjectRepository(DbClient) private readonly repository: Repository<DbClient>) {}

  async findById(id: string): Promise<Client | null> {
    const dbClient = await this.repository.findOneBy({ id });

    if (dbClient === null) {
      return null;
    }

    return ClientMapper.toDomain(dbClient);
  }

  async findByUserId(userId: string, pagination: PaginationQuery): Promise<Client[]> {
    const dbClients = await this.repository.find({
      where: { userId },
      skip: pagination.offset,
      take: pagination.limit,
      order: { createdAt: "DESC" },
    });

    return dbClients.map(ClientMapper.toDomain);
  }

  async findAll(pagination: PaginationQuery): Promise<Client[]> {
    const dbClients = await this.repository.find({
      skip: pagination.offset,
      take: pagination.limit,
      order: { createdAt: "DESC" },
    });

    return dbClients.map(ClientMapper.toDomain);
  }

  async count(): Promise<number> {
    return this.repository.count();
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({ where: { userId } });
  }

  async save(client: Client): Promise<void> {
    const dbClient = ClientMapper.toPersistence(client);

    await this.repository.save(dbClient);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
