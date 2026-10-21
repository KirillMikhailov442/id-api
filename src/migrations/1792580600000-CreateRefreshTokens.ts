import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRefreshTokens1792580600000 implements MigrationInterface {
  name = "CreateRefreshTokens1792580600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
            CREATE INDEX "tokens_index_0" ON "refresh_tokens" ("user_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "refresh_tokens_index_1" ON "refresh_tokens" ("family_id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."refresh_tokens_index_1"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."tokens_index_0"
        `);
    await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
  }
}
