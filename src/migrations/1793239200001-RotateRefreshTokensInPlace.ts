import type { MigrationInterface, QueryRunner } from "typeorm";

export class RotateRefreshTokensInPlace1793239200001 implements MigrationInterface {
  name = "RotateRefreshTokensInPlace1793239200001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "last_used_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`UPDATE "refresh_tokens" SET "last_used_at" = "created_at"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ALTER COLUMN "last_used_at" SET NOT NULL`);
    await queryRunner.query(`DROP INDEX "refresh_tokens_index_1"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "family_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "family_id" uuid`);
    await queryRunner.query(`UPDATE "refresh_tokens" SET "family_id" = "id"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ALTER COLUMN "family_id" SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX "refresh_tokens_index_1" ON "refresh_tokens" ("family_id")`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "last_used_at"`);
  }
}
