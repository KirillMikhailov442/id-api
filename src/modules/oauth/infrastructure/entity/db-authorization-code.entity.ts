import { Column, Entity, PrimaryColumn } from "typeorm";

import { MAX_LENGTH as CODE_HASH_MAX_LENGTH } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { MAX_LENGTH as CODE_SCOPES_MAX_LENGTH } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { MAX_LENGTH as REDIRECT_URI_MAX_LENGTH } from "@modules/oauth/domain/value-object/redirect-uri.value-object";

@Entity("authorization_codes")
export class DbAuthorizationCode {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "client_id" })
  clientId: string;

  @Column("uuid", { name: "user_id" })
  userId: string;

  @Column("varchar", { length: CODE_HASH_MAX_LENGTH, name: "code_hash" })
  codeHash: string;

  @Column("varchar", { length: CODE_SCOPES_MAX_LENGTH })
  scopes: string;

  @Column("varchar", { length: REDIRECT_URI_MAX_LENGTH, name: "redirect_uri" })
  redirectUri: string;

  @Column("boolean", { name: "is_used" })
  isUsed: boolean;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt: Date;
}
