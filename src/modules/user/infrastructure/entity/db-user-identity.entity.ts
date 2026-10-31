import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";

import type { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";

export const IDENTITY_PROVIDER_MAX_LENGTH = 32;
export const PROVIDER_USER_ID_MAX_LENGTH = 255;

@Entity("user_identities")
export class DbUserIdentity {
  @PrimaryColumn("varchar", { length: IDENTITY_PROVIDER_MAX_LENGTH })
  provider: IdentityProvider;

  @PrimaryColumn("varchar", { length: PROVIDER_USER_ID_MAX_LENGTH })
  providerUserId: string;

  @Column("uuid", { unique: true })
  userId: string;

  @OneToOne(() => DbUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: DbUser;
}
