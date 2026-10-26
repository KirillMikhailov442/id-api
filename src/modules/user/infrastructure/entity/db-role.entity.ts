import { Column, Entity, PrimaryColumn } from "typeorm";

import { MAX_LENGTH as ROLE_NAME_MAX_LENGTH } from "@modules/user/domain/value-object/role-name.value-object";

@Entity("roles")
export class DbRole {
  @PrimaryColumn("uuid")
  id: string;
  @Column("varchar", { length: ROLE_NAME_MAX_LENGTH, unique: true })
  name: string;
  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
