import { randomUUID } from "node:crypto";

import * as bcrypt from "bcrypt";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1792742368266 implements MigrationInterface {
  name = "InitSchema1792742368266";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL,
                "name" character varying(64) NOT NULL,
                "surname" character varying(64) NOT NULL,
                "email" character varying(128) NOT NULL,
                "passwordHash" character varying(72) NOT NULL,
                "emailConfirmed" boolean NOT NULL,
                "blocked" boolean NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IX_users_updated_at" ON "users" ("updated_at")
        `);

    // roles + user_roles
    await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL,
                "name" character varying(32) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"),
                CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_roles" (
                "userId" uuid NOT NULL,
                "roleId" uuid NOT NULL,
                "appointedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_88481b0c4ed9ada47e9fdd67475" PRIMARY KEY ("userId", "roleId")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_roles"
            ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE INDEX "IX_user_roles_userId" ON "user_roles" ("userId")
        `);
    await queryRunner.query(`
            CREATE INDEX "IX_user_roles_roleId" ON "user_roles" ("roleId")
        `);

    // refresh_tokens
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "refresh_hash" character varying(255) NOT NULL,
                "user_agent" character varying(255) NOT NULL DEFAULT 'unknown',
                "ip" character varying(45) NOT NULL DEFAULT 'unknown',
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "family_id" uuid NOT NULL,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "UQ_1c8a52d9b3f7e4a6c0d5b8e3f" UNIQUE ("refresh_hash"),
                CONSTRAINT "PK_8b6f2d4a9e1c3f5a7b0d2c4e6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE INDEX "tokens_index_0" ON "refresh_tokens" ("user_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "refresh_tokens_index_1" ON "refresh_tokens" ("family_id")
        `);

    // scopes
    await queryRunner.query(`
            CREATE TABLE "scopes" (
                "id" uuid NOT NULL,
                "name" character varying(32) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "UQ_1029065e5c13f582d843d73dee5" UNIQUE ("name"),
                CONSTRAINT "PK_fb1f703d1ac574fe4551a354977" PRIMARY KEY ("id")
            )
        `);

    // clients
    await queryRunner.query(`
            CREATE TABLE "clients" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "name" character varying(64) NOT NULL,
                "secret_hash" character varying(255) NOT NULL,
                "is_active" boolean NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "clients"
            ADD CONSTRAINT "FK_clients_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE INDEX "clients_index_0" ON "clients" ("user_id")
        `);

    // client_scopes
    await queryRunner.query(`
            CREATE TABLE "client_scopes" (
                "client_id" uuid NOT NULL,
                "scope_id" uuid NOT NULL,
                "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_29de6b0268abc87d538ab3494e6" PRIMARY KEY ("client_id", "scope_id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "client_scopes"
            ADD CONSTRAINT "FK_client_scopes_client_id" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "client_scopes"
            ADD CONSTRAINT "FK_client_scopes_scope_id" FOREIGN KEY ("scope_id") REFERENCES "scopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            CREATE INDEX "client_scopes_index_0" ON "client_scopes" ("client_id", "scope_id")
        `);

    // locations
    await queryRunner.query(`
            CREATE TABLE "locations" (
                "id" uuid NOT NULL,
                "client_id" uuid NOT NULL,
                "href" character varying(255) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "locations"
            ADD CONSTRAINT "FK_locations_client_id" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // authorization_codes
    await queryRunner.query(`
            CREATE TABLE "authorization_codes" (
                "id" uuid NOT NULL,
                "client_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "code_hash" character varying(255) NOT NULL,
                "scopes" character varying(255) NOT NULL,
                "redirect_uri" character varying(255) NOT NULL,
                "is_used" boolean NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_f05b2eb99ad2db12d87544656c4" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "authorization_codes"
            ADD CONSTRAINT "FK_authorization_codes_client_id" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "authorization_codes"
            ADD CONSTRAINT "FK_authorization_codes_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // seed: roles
    await queryRunner.query(`
            INSERT INTO "roles" ("id", "name", "created_at")
            VALUES ('${randomUUID()}', 'USER', now())
        `);
    await queryRunner.query(`
            INSERT INTO "roles" ("id", "name", "created_at")
            VALUES ('${randomUUID()}', 'ADMIN', now())
        `);

    // seed: scopes
    await queryRunner.query(`
            INSERT INTO "scopes" ("id", "name", "created_at")
            VALUES ('${randomUUID()}', 'openid', now())
        `);

    // seed: super-user with ADMIN role
    await queryRunner.query(`
            INSERT INTO "users" ("id", "name", "surname", "email", "passwordHash", "emailConfirmed", "blocked", "created_at", "updated_at")
            VALUES (
                '${randomUUID()}',
                'Super',
                'User',
                'admin@id-api.local',
                '${bcrypt.hashSync("super-user", 10)}',
                true,
                false,
                now(),
                now()
            )
        `);
    await queryRunner.query(`
            INSERT INTO "user_roles" ("userId", "roleId", "appointedAt")
            SELECT "users"."id", "roles"."id", now()
            FROM "users"
            JOIN "roles" ON "roles"."name" = 'ADMIN'
            WHERE "users"."email" = 'admin@id-api.local'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP TABLE "authorization_codes"
        `);
    await queryRunner.query(`
            DROP TABLE "locations"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."client_scopes_index_0"
        `);
    await queryRunner.query(`
            DROP TABLE "client_scopes"
        `);
    await queryRunner.query(`
            DROP TABLE "clients"
        `);
    await queryRunner.query(`
            DROP TABLE "scopes"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."refresh_tokens_index_1"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."tokens_index_0"
        `);
    await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IX_user_roles_roleId"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IX_user_roles_userId"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"
        `);
    await queryRunner.query(`
            DROP TABLE "user_roles"
        `);
    await queryRunner.query(`
            DROP TABLE "roles"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IX_users_updated_at"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
