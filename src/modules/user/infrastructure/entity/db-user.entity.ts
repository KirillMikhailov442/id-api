import { Column, Entity, PrimaryColumn } from "typeorm";

import { DEFAULT_AVATAR_PATH, PASSWORD_HASH_MAX_LENGTH } from "@modules/user/domain/entity/user";
import { EMAIL_MAX_LENGTH } from "@modules/user/domain/value-object/email.value-object";
import { NAME_MAX_LENGTH } from "@modules/user/domain/value-object/name.value-object";
import { SURNAME_MAX_LENGTH } from "@modules/user/domain/value-object/surname.value-object";

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

  @Column("varchar", { default: DEFAULT_AVATAR_PATH })
  avatar: string;

  @Column("varchar", { length: PASSWORD_HASH_MAX_LENGTH, nullable: true })
  passwordHash: string | null;

  @Column("boolean")
  emailConfirmed: boolean;

  @Column("boolean")
  blocked: boolean;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @Column({ type: "timestamptz", name: "updated_at" })
  updatedAt: Date;
}
