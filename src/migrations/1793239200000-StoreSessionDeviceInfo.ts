import type { MigrationInterface, QueryRunner } from "typeorm";

export class StoreSessionDeviceInfo1793239200000 implements MigrationInterface {
  name = "StoreSessionDeviceInfo1793239200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "browser" character varying(128), ADD "os" character varying(128), ADD "device_type" character varying(128)`
    );
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "user_agent"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "user_agent" character varying(255) NOT NULL DEFAULT 'unknown'`
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "device_type", DROP COLUMN "os", DROP COLUMN "browser"`
    );
  }
}
