import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { DEFAULT_ROLE_NAME } from "@modules/user/application/handler/create-user.command.handler";
import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";

import dataSource from "@config/database";

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    const repository = dataSource.getRepository(DbRole);
    const existing = await repository.findOneBy({ name: DEFAULT_ROLE_NAME });

    if (existing) {
      console.log(`Role "${DEFAULT_ROLE_NAME}" already exists`);
      return;
    }

    const role = new DbRole();
    role.id = randomUUID();
    role.name = DEFAULT_ROLE_NAME;
    role.createdAt = new Date();

    await repository.insert(role);
    console.log(`Role "${DEFAULT_ROLE_NAME}" seeded (id: ${role.id})`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
