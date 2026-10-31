import { Inject, Injectable } from "@nestjs/common";
import { DbTransactionRunner } from "@shared/transaction/db-transaction-runner";
import type { EntityManager } from "typeorm";

import type { IClientsTransaction, IClientsTransactionContext } from "@modules/oauth/application/port/transaction.port";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { DbClientScopeRepository } from "@modules/oauth/infrastructure/repository/db-client-scope.repository";
import { DbClientRepository } from "@modules/oauth/infrastructure/repository/db-client.repository";
import { DbOAuthGrantContext } from "@modules/oauth/infrastructure/repository/db-oauth-grant.store";
import { DbScopeRepository } from "@modules/oauth/infrastructure/repository/db-scope.repository";

@Injectable()
export class DbClientsTransaction implements IClientsTransaction {
  constructor(
    @Inject(DbTransactionRunner)
    private readonly runner: DbTransactionRunner
  ) {}

  run<T>(work: (context: IClientsTransactionContext) => Promise<T>): Promise<T> {
    return this.runner.run((entityManager) => work(this.buildContext(entityManager)));
  }

  private buildContext(entityManager: EntityManager): IClientsTransactionContext {
    return {
      oauthGrants: new DbOAuthGrantContext(entityManager),
      clientRepository: new DbClientRepository(entityManager.getRepository(DbClient)),
      clientScopeRepository: new DbClientScopeRepository(entityManager.getRepository(DbClientScope)),
      scopeRepository: new DbScopeRepository(entityManager.getRepository(DbScope)),
    };
  }
}
