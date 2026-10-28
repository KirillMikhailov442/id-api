import type { MigrationInterface, QueryRunner } from "typeorm";

export class UseSingleClientLocation1793239200002 implements MigrationInterface {
  name = "UseSingleClientLocation1793239200002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "locations" GROUP BY "client_id" HAVING count(*) > 1) THEN
        RAISE EXCEPTION 'Clients with multiple locations must be reduced to one location before migrating';
      END IF;
    END $$`);
    await queryRunner.query(`ALTER TABLE "clients" ADD "location" character varying(255)`);
    await queryRunner.query(
      `UPDATE "clients" SET "location" = "locations"."href" FROM "locations" WHERE "locations"."client_id" = "clients"."id"`
    );
    await queryRunner.query(`DROP TABLE "locations"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "locations" (
      "id" uuid NOT NULL,
      "client_id" uuid NOT NULL,
      "href" character varying(255) NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
      CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"),
      CONSTRAINT "FK_locations_client_id" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    )`);
    await queryRunner.query(
      `INSERT INTO "locations" ("id", "client_id", "href", "created_at") SELECT "id", "id", "location", "created_at" FROM "clients" WHERE "location" IS NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN "location"`);
  }
}
