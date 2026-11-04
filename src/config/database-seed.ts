import type { DataSource } from "typeorm";

const SYSTEM_ROLE_NAMES = ["USER", "ADMIN", "SUPERUSER"];
const DEFAULT_SCOPE_NAMES = ["openid", "user:read", "user:write", "offline_access"];

export async function seedDatabase(source: DataSource): Promise<void> {
  await source.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO "roles" ("id", "name", "created_at")
       SELECT gen_random_uuid(), name, now() FROM unnest($1::text[]) AS names(name)
       ON CONFLICT ("name") DO NOTHING`,
      [SYSTEM_ROLE_NAMES]
    );
    await manager.query(
      `INSERT INTO "scopes" ("id", "name", "created_at")
       SELECT gen_random_uuid(), name, now() FROM unnest($1::text[]) AS names(name)
       ON CONFLICT ("name") DO NOTHING`,
      [DEFAULT_SCOPE_NAMES]
    );
  });
}
