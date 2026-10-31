import { Column, Entity, Index, PrimaryColumn, VirtualColumn } from "typeorm";

import { BROWSER_NAME_MAX_LENGTH } from "@modules/session/domain/value-object/browser.value-object";
import { DEVICE_TYPE_NAME_MAX_LENGTH } from "@modules/session/domain/value-object/device-type.value-object";
import { IP_MAX_LENGTH } from "@modules/session/domain/value-object/ip.value-object";
import { OPERATING_SYSTEM_NAME_MAX_LENGTH } from "@modules/session/domain/value-object/operating-system.value-object";

@Entity("sessions")
@Index("sessions_user_id_idx", ["userId"])
export class DbSession {
  @PrimaryColumn("uuid")
  id: string;

  @Column("uuid", { name: "user_id" })
  userId: string;

  @VirtualColumn({
    type: "integer",
    query: (alias) => `SELECT COUNT(*)::integer FROM session_refresh_tokens t WHERE t.session_id = ${alias}.id`,
  })
  refreshTokenCount: number;

  @Column("varchar", { length: BROWSER_NAME_MAX_LENGTH, name: "browser", nullable: true })
  browser: string | null;

  @Column("varchar", { length: OPERATING_SYSTEM_NAME_MAX_LENGTH, name: "os", nullable: true })
  os: string | null;

  @Column("varchar", { length: DEVICE_TYPE_NAME_MAX_LENGTH, name: "device_type", nullable: true })
  deviceType: string | null;

  @Column("varchar", { length: IP_MAX_LENGTH, name: "ip", default: "unknown" })
  ip: string;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt: Date;

  @Column({ type: "timestamptz", name: "expires_at" })
  expiresAt: Date;

  @Column({ type: "timestamptz", name: "last_used_at" })
  lastUsedAt: Date;

  @Column({ type: "timestamptz", name: "last_access_expires_at" })
  lastAccessExpiresAt: Date;

  @Column({ type: "timestamptz", name: "revoked_at", nullable: true })
  revokedAt: Date | null;
}
