import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("oauth_grants")
@Index("oauth_grants_user_idx", ["userId"])
@Index("oauth_grants_client_idx", ["clientId"])
export class DbOAuthGrant {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "user_id" })
  userId: string;

  @Column("uuid", { name: "client_id" })
  clientId: string;

  @Column("text", { array: true })
  scopes: string[];

  @Column("text")
  audience: string;

  @Column("timestamptz", { name: "created_at" })
  createdAt: Date;

  @Column("timestamptz", { name: "expires_at" })
  expiresAt: Date;

  @Column("timestamptz", { name: "last_access_expires_at" })
  lastAccessExpiresAt: Date;

  @Column("timestamptz", { name: "revoked_at", nullable: true })
  revokedAt: Date | null;
}
