import { Column, Entity, Index, PrimaryColumn } from "typeorm";

import { PASSWORD_MAX_LENGTH } from "@core/domain/entity/user";
import { MAX_LENGTH as EMAIL_MAX_LENGTH } from "@core/domain/value-object/email.value-object";
import { MAX_LENGTH as NAME_MAX_LENGTH } from "@core/domain/value-object/name.value-object";
import { MAX_LENGTH as SURNAME_MAX_LENGTH } from "@core/domain/value-object/surname.value-object";

@Entity("users")
export class DbUser {
  @PrimaryColumn("uuid")
  id: string;

  @Column("varchar", { length: NAME_MAX_LENGTH })
  name: string;

  @Column("varchar", { length: SURNAME_MAX_LENGTH })
  surname: string;

  @Column("varchar", { length: EMAIL_MAX_LENGTH, unique: true })
  email: string;

  @Column("varchar", { length: PASSWORD_MAX_LENGTH })
  passwordHash: string;

  @Column("boolean")
  emailConfirmed: boolean;

  @Column("boolean")
  blocked: boolean;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @Column({ type: "timestamptz", name: "updated_at" })
  @Index("IX_users_updated_at")
  updatedAt: Date;
}
