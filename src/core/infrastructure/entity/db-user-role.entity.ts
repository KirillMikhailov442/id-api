import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { DbRole } from "@core/infrastructure/entity/db-role.entity";
import { DbUser } from "@core/infrastructure/entity/db-user.entity";

@Entity("user_roles")
export class DbUserRole {
  @PrimaryColumn("uuid")
  userId: string;

  @PrimaryColumn("uuid")
  roleId: string;

  @Column("timestamptz")
  appointedAt: Date;

  @ManyToOne(() => DbUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: DbUser;

  @ManyToOne(() => DbRole, { onDelete: "CASCADE" })
  @JoinColumn({ name: "roleId" })
  role: DbRole;
}
