import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRolesRoleIdIndex1792580320682 implements MigrationInterface {
  name = "AddUserRolesRoleIdIndex1792580320682";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX "IX_user_roles_roleId" ON "user_roles" ("roleId")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IX_user_roles_roleId"
        `);
  }
}
