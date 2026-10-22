import { Inject, Injectable } from "@nestjs/common";
import { DbTransactionRunner } from "@shared/infrastructure/transaction/db-transaction-runner";
import type { EntityManager } from "typeorm";

import type { ITransaction, ITransactionContext } from "@modules/user/application/port/transaction.port";
import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { DbRoleRepository } from "@modules/user/infrastructure/repository/db-role.repository";
import { DbUserRoleRepository } from "@modules/user/infrastructure/repository/db-user-role.repository";
import { DbUserRepository } from "@modules/user/infrastructure/repository/db-user.repository";

@Injectable()
export class DbTransaction implements ITransaction {
  constructor(@Inject(DbTransactionRunner) private readonly runner: DbTransactionRunner) {}

  run<T>(work: (context: ITransactionContext) => Promise<T>): Promise<T> {
    return this.runner.run((entityManager) => work(this.buildContext(entityManager)));
  }

  private buildContext(entityManager: EntityManager): ITransactionContext {
    return {
      userRepository: new DbUserRepository(
        entityManager.getRepository(DbUser),
        entityManager.getRepository(DbUserRole)
      ),
      roleRepository: new DbRoleRepository(entityManager.getRepository(DbRole)),
      userRoleRepository: new DbUserRoleRepository(
        entityManager.getRepository(DbUserRole),
        entityManager.getRepository(DbRole)
      ),
    };
  }
}
