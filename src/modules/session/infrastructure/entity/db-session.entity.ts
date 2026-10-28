import { Column, Entity, Index, PrimaryColumn } from "typeorm";

import { MAX_LENGTH as IP_MAX_LENGTH } from "@modules/session/domain/value-object/ip.value-object";
import { MAX_LENGTH as REFRESH_HASH_MAX_LENGTH } from "@modules/session/domain/value-object/refresh-hash.value-object";

@Entity("refresh_tokens")
@Index("tokens_index_0", ["userId"])
export class DbSession {
  @PrimaryColumn("uuid")
  id: string;
  @Column("uuid", { name: "user_id" })
  userId: string;
  @Column("varchar", { length: REFRESH_HASH_MAX_LENGTH, unique: true, name: "refresh_hash" })
  refreshHash: string;
  @Column("varchar", { length: 128, name: "browser", nullable: true })
  browser: string | null;

  @Column("varchar", { length: 128, name: "os", nullable: true })
  os: string | null;

  @Column("varchar", { length: 128, name: "device_type", nullable: true })
  deviceType: string | null;
  @Column("varchar", { length: IP_MAX_LENGTH, name: "ip", default: "unknown" })
  ip: string;
  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt: Date;
  @Column({ type: "timestamptz", name: "last_used_at" })
  lastUsedAt: Date;
  @Column({ type: "timestamptz", name: "revoked_at", nullable: true })
  revokedAt: Date | null;
}
