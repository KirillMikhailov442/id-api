import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource, EntityManager } from "typeorm";

import type { IClientsTransaction, IClientsTransactionContext } from "@modules/oauth/application/port/transaction.port";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbLocation } from "@modules/oauth/infrastructure/entity/db-location.entity";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { DbClientScopeRepository } from "@modules/oauth/infrastructure/repository/db-client-scope.repository";
import { DbClientRepository } from "@modules/oauth/infrastructure/repository/db-client.repository";
import { DbLocationRepository } from "@modules/oauth/infrastructure/repository/db-location.repository";
import { DbScopeRepository } from "@modules/oauth/infrastructure/repository/db-scope.repository";

@Injectable()
export class DbClientsTransaction implements IClientsTransaction {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  run<T>(work: (context: IClientsTransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((entityManager) => work(this.buildContext(entityManager)));
  }

  private buildContext(entityManager: EntityManager): IClientsTransactionContext {
    return {
      clientRepository: new DbClientRepository(entityManager.getRepository(DbClient)),
      locationRepository: new DbLocationRepository(entityManager.getRepository(DbLocation)),
      clientScopeRepository: new DbClientScopeRepository(entityManager.getRepository(DbClientScope)),
      scopeRepository: new DbScopeRepository(entityManager.getRepository(DbScope)),
    };
  }
}
