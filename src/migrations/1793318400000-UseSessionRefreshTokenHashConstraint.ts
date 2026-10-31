import type { MigrationInterface, QueryRunner } from "typeorm";

export class UseSessionRefreshTokenHashConstraint1793318400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_refresh_tokens"
      ADD CONSTRAINT "UQ_0c088f7a31f53d7421702ba7f2e"
      UNIQUE USING INDEX "session_refresh_tokens_hash_idx"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "session_refresh_tokens"
      DROP CONSTRAINT "UQ_0c088f7a31f53d7421702ba7f2e"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "session_refresh_tokens_hash_idx"
      ON "session_refresh_tokens" ("token_hash")
    `);
  }
}
