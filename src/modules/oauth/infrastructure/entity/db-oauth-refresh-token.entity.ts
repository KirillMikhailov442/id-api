import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("oauth_refresh_tokens")
@Index("oauth_refresh_tokens_grant_idx", ["grantId"])
@Index("oauth_refresh_tokens_hash_idx", ["tokenHash"], { unique: true })
@Index("oauth_refresh_tokens_current_idx", ["grantId"], {
  unique: true,
  where: '"used_at" IS NULL AND "revoked_at" IS NULL',
})
export class DbOAuthRefreshToken {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "grant_id" })
  grantId: string;

  @Column("varchar", { name: "token_hash", length: 64 })
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
