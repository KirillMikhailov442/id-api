import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import * as dotenv from "dotenv";
import { DataSource } from "typeorm";

for (const path of [`.env.${process.env.NODE_ENV}`, ".env"]) {
  dotenv.config({ path, override: false });
}

const baseConnectionOptions = {
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
} as const;

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    ...baseConnectionOptions,
    autoLoadEntities: true,
    synchronize: false,
    logging: ["error", "warn"],
  };
}

export default new DataSource({
  ...baseConnectionOptions,
  entities: ["src/**/*entity.ts"],
  migrations: ["src/migrations/*.ts"],
  synchronize: false,
});
