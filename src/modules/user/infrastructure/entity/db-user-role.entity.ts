import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import { DbRole } from "@modules/user/infrastructure/entity/db-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";

@Entity("user_roles")
export class DbUserRole {
  @PrimaryColumn("uuid")
  userId: string;

  @PrimaryColumn("uuid")
  @Index()
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
