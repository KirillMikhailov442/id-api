import { Column, Entity, Index, PrimaryColumn } from "typeorm";

import { MAX_LENGTH as IP_MAX_LENGTH } from "@modules/session/domain/value-object/ip.value-object";
import { MAX_LENGTH as REFRESH_HASH_MAX_LENGTH } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { MAX_LENGTH as USER_AGENT_MAX_LENGTH } from "@modules/session/domain/value-object/user-agent.value-object";

@Entity("refresh_tokens")
@Index("tokens_index_0", ["userId"])
@Index("refresh_tokens_index_1", ["familyId"])
export class DbSession {
  @PrimaryColumn("uuid")
  id: string;
  @Column("uuid", { name: "user_id" })
  userId: string;
  @Column("varchar", { length: REFRESH_HASH_MAX_LENGTH, unique: true, name: "refresh_hash" })
  refreshHash: string;
  @Column("varchar", { length: USER_AGENT_MAX_LENGTH, name: "user_agent", default: "unknown" })
  userAgent: string;
  @Column("varchar", { length: IP_MAX_LENGTH, name: "ip", default: "unknown" })
  ip: string;
  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;
  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt: Date;
  @Column("uuid", { name: "family_id" })
  familyId: string;
  @Column({ type: "timestamptz", name: "revoked_at", nullable: true })
  revokedAt: Date | null;
}
