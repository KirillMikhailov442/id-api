import "reflect-metadata";

import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { DbTransactionRunner } from "@shared/transaction/db-transaction-runner";
import { DataSource, type EntityManager } from "typeorm";

import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbOAuthGrant } from "@modules/oauth/infrastructure/entity/db-oauth-grant.entity";
import { DbOAuthRefreshToken } from "@modules/oauth/infrastructure/entity/db-oauth-refresh-token.entity";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { DbClientsTransaction } from "@modules/oauth/infrastructure/transaction/db-clients-transaction";
import { DbSessionRefreshToken } from "@modules/session/infrastructure/entity/db-session-refresh-token.entity";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUserIdentity } from "@modules/user/infrastructure/entity/db-user-identity.entity";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { DbTransaction } from "@modules/user/infrastructure/transaction/db-transaction";

import { RedisConnection } from "@config/redis";

import { InitSchema1792742368266 } from "@app/migrations/1792742368266-InitSchema";

export async function databaseFixture() {
  const url = process.env.INTEGRATION_DATABASE_URL;

  if (url === undefined || url.length === 0)
    throw new Error("Run pnpm test:integration or provide INTEGRATION_DATABASE_URL for a test database");

  const schema = `integration_${randomUUID().replaceAll("-", "")}`;
  const admin = new DataSource({ type: "postgres", url });
  await admin.initialize();
  await admin.query(`CREATE SCHEMA "${schema}"`);

  const source = new DataSource({
    type: "postgres",
    url,
    schema,
    extra: { options: `-c search_path=${schema}`, max: 8, connectionTimeoutMillis: 5000 },
    entities: [
      DbUser,
      DbRole,
      DbUserRole,
      DbUserIdentity,
      DbSession,
      DbSessionRefreshToken,
      DbClient,
      DbScope,
      DbClientScope,
      DbAuthorizationCode,
      DbOAuthGrant,
      DbOAuthRefreshToken,
    ],
    migrations: [InitSchema1792742368266],
    synchronize: false,
    logging: false,
  });

  async function close() {
    if (source.isInitialized) await source.destroy();

    try {
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await admin.destroy();
    }
  }

  try {
    await source.initialize();
    await source.runMigrations();
  } catch (error) {
    await close();
    throw error;
  }

  return {
    source,
    schema,
    close,
    users: new DbTransaction(new DbTransactionRunner(source)),
    clients: new DbClientsTransaction(new DbTransactionRunner(source)),
    async reset() {
      await source.query(`TRUNCATE TABLE "${schema}".users, "${schema}".roles, "${schema}".scopes CASCADE`);
    },
  };
}
export async function redisFixture() {
  const url = process.env.INTEGRATION_REDIS_URL;

  if (url === undefined || url.length === 0)
    throw new Error("Run pnpm test:integration or provide INTEGRATION_REDIS_URL for a test Redis");

  const connection = new RedisConnection(
    new ConfigService({ REDIS_URL: url, REDIS_COMMAND_TIMEOUT: 3000, REDIS_CONNECT_TIMEOUT: 3000 })
  );
  await connection.onModuleInit();

  const keys = new Set<string>();

  return {
    connection,
    track(key: string) {
      keys.add(key);

      return key;
    },
    async close() {
      try {
        if (keys.size > 0) await connection.execute((client) => client.del([...keys]));
      } finally {
        connection.onModuleDestroy();
      }
    },
  };
}
export async function eventually(assertion: () => Promise<void>, timeout = 3000) {
  const deadline = Date.now() + timeout;

  for (;;) {
    try {
      await assertion();

      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;

      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

export async function verifyDatabaseLock(source: DataSource, lock: (manager: EntityManager) => Promise<unknown>) {
  const first = source.createQueryRunner();
  const second = source.createQueryRunner();
  await first.connect();
  await second.connect();

  try {
    await first.startTransaction();
    await second.startTransaction();

    const [firstBackend] = await first.manager.query<{ pid: number }[]>("SELECT pg_backend_pid() AS pid");
    const [secondBackend] = await second.manager.query<{ pid: number }[]>("SELECT pg_backend_pid() AS pid");
    await lock(first.manager);

    const pending = lock(second.manager);
    const settled = pending.then(
      (value) => ({ value }),
      (error) => ({ error: error as unknown })
    );

    try {
      await eventually(async () => {
        const [result] = await source.query<{ blockers: number[] }[]>("SELECT pg_blocking_pids($1) AS blockers", [
          secondBackend.pid,
        ]);
        expect(result.blockers).toContain(firstBackend.pid);
      });
    } finally {
      await first.rollbackTransaction();
    }

    const result = await settled;

    if ("error" in result) throw result.error;
  } finally {
    if (first.isTransactionActive) await first.rollbackTransaction();

    if (second.isTransactionActive) await second.rollbackTransaction();

    await first.release();
    await second.release();
  }
}
