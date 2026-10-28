import { Inject, Injectable } from "@nestjs/common";
import { DbTransactionRunner } from "@shared/infrastructure/transaction/db-transaction-runner";
import type { EntityManager } from "typeorm";

import type { IClientsTransaction, IClientsTransactionContext } from "@modules/oauth/application/port/transaction.port";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { DbClientScopeRepository } from "@modules/oauth/infrastructure/repository/db-client-scope.repository";
import { DbClientRepository } from "@modules/oauth/infrastructure/repository/db-client.repository";
import { DbScopeRepository } from "@modules/oauth/infrastructure/repository/db-scope.repository";

@Injectable()
export class DbClientsTransaction implements IClientsTransaction {
  private readonly runner: DbTransactionRunner;

  constructor(
    @Inject(DbTransactionRunner)
    runner: DbTransactionRunner
  ) {
    this.runner = runner;
  }

  run<T>(work: (context: IClientsTransactionContext) => Promise<T>): Promise<T> {
    return this.runner.run((entityManager) => work(this.buildContext(entityManager)));
  }

  private buildContext(entityManager: EntityManager): IClientsTransactionContext {
    return {
      clientRepository: new DbClientRepository(entityManager.getRepository(DbClient)),
      clientScopeRepository: new DbClientScopeRepository(entityManager.getRepository(DbClientScope)),
      scopeRepository: new DbScopeRepository(entityManager.getRepository(DbScope)),
    };
  }
}
