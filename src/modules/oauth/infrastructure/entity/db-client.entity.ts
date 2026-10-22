import { Column, Entity, Index, PrimaryColumn } from "typeorm";

import { SECRET_HASH_MAX_LENGTH } from "@modules/oauth/domain/entity/client";
import { MAX_LENGTH as CLIENT_NAME_MAX_LENGTH } from "@modules/oauth/domain/value-object/client-name.value-object";

@Entity("clients")
@Index("clients_index_0", ["userId"])
export class DbClient {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "user_id" })
  userId: string;

  @Column("varchar", { length: CLIENT_NAME_MAX_LENGTH })
  name: string;

  @Column("varchar", { length: SECRET_HASH_MAX_LENGTH, name: "secret_hash" })
  secretHash: string;

  @Column("boolean", { name: "is_active" })
  isActive: boolean;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
}
