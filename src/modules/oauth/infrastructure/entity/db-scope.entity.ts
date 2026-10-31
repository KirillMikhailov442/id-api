import { Column, Entity, PrimaryColumn } from "typeorm";

import { SCOPE_NAME_MAX_LENGTH } from "@modules/oauth/domain/value-object/scope-name.value-object";

@Entity("scopes")
export class DbScope {
  @PrimaryColumn("uuid")
  id: string;

  @Column("varchar", { length: SCOPE_NAME_MAX_LENGTH, unique: true })
  name: string;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
