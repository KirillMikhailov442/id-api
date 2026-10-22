import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateOAuthTables1792698940238 implements MigrationInterface {
    name = 'CreateOAuthTables1792698940238'

    public async up(queryRunner: QueryRunner): Promise<void> {
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
            CREATE TABLE "client_scopes" (
                "client_id" uuid NOT NULL,
                "scope_id" uuid NOT NULL,
                "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_29de6b0268abc87d538ab3494e6" PRIMARY KEY ("client_id", "scope_id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "client_scopes_index_0" ON "client_scopes" ("client_id", "scope_id")
        `);
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
            CREATE INDEX "clients_index_0" ON "clients" ("user_id")
        `);
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
            CREATE TABLE "scopes" (
                "id" uuid NOT NULL,
                "name" character varying(32) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "UQ_1029065e5c13f582d843d73dee5" UNIQUE ("name"),
                CONSTRAINT "PK_fb1f703d1ac574fe4551a354977" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "locations"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."clients_index_0"
        `);
        await queryRunner.query(`
            DROP TABLE "clients"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."client_scopes_index_0"
        `);
        await queryRunner.query(`
            DROP TABLE "client_scopes"
        `);
        await queryRunner.query(`
            DROP TABLE "authorization_codes"
        `);
    }

}
