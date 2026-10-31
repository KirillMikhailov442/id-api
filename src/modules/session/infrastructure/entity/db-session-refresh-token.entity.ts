import { Column, Entity, Index, PrimaryColumn } from "typeorm";

import { REFRESH_HASH_MAX_LENGTH } from "@modules/session/domain/value-object/refresh-hash.value-object";

@Entity("session_refresh_tokens")
@Index("session_refresh_tokens_session_idx", ["sessionId"])
@Index("session_refresh_tokens_current_idx", ["sessionId"], {
  unique: true,
  where: '"used_at" IS NULL AND "revoked_at" IS NULL',
})
export class DbSessionRefreshToken {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "session_id" })
  sessionId: string;

  @Column("varchar", { name: "token_hash", length: REFRESH_HASH_MAX_LENGTH, unique: true })
  tokenHash: string;

  @Column("timestamptz", { name: "created_at" })
  createdAt: Date;

  @Column("timestamptz", { name: "expires_at" })
  expiresAt: Date;

  @Column("timestamptz", { name: "used_at", nullable: true })
  usedAt: Date | null;

  @Column("timestamptz", { name: "revoked_at", nullable: true })
  revokedAt: Date | null;
}
