import { Column, Entity, Index, PrimaryColumn } from "typeorm";

import { UserBlockedStatus } from "@core/domain/enum/user-blocked-status.enum";
import { UserEmailConfirmedStatus } from "@core/domain/enum/user-email-confirmed-status.enum";

@Entity("users")
export class DbUser {
  @PrimaryColumn("uuid")
  id: string;

  @Column("varchar", { length: 64 })
  name: string;

  @Column("varchar", { length: 64 })
  surname: string;

  @Column("varchar", { length: 128, unique: true })
  email: string;

  @Column("varchar", { length: 255 })
  passwordHash: string;

  @Column("varchar", { length: 16 })
  emailConfirmed: UserEmailConfirmedStatus;

  @Column("varchar", { length: 16 })
  blocked: UserBlockedStatus;

  @Column("timestamptz")
  createdAt: Date;

  @Column("timestamptz")
  @Index("IX_users_updated_at")
  updatedAt: Date;
}
