import { Session } from "@modules/session/domain/entity/session";
import { DeviceTypeName } from "@modules/session/domain/enum/device-type.enum";
import { Browser } from "@modules/session/domain/value-object/browser.value-object";
import { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { SessionId } from "@modules/session/session.ids";
import { UserId } from "@modules/user/user.ids";

export class SessionMapper {
  static toDomain(dbSession: DbSession): Session {
    return new Session(
      SessionId.from(dbSession.id),
      UserId.from(dbSession.userId),
      Browser.fromNullable(dbSession.browser),
      OperatingSystem.fromNullable(dbSession.os),
      DeviceType.fromNullable(dbSession.deviceType === "mobile" ? DeviceTypeName.Smartphone : dbSession.deviceType),
      new Ip(dbSession.ip),
      dbSession.createdAt,
      dbSession.expiresAt,
      dbSession.lastUsedAt,
      dbSession.revokedAt,
      dbSession.refreshTokenCount,
      dbSession.lastAccessExpiresAt
    );
  }

  static toPersistence(session: Session): DbSession {
    const dbSession = new DbSession();

    dbSession.id = session.getId().getValue();
    dbSession.userId = session.getUserId().getValue();

    dbSession.browser = session.getBrowser()?.getValue() ?? null;
    dbSession.os = session.getOs()?.getValue() ?? null;
    dbSession.deviceType = session.getDeviceType()?.getValue() ?? null;
    dbSession.ip = session.getIp().getValue();
    dbSession.createdAt = session.getCreatedAt();
    dbSession.expiresAt = session.getExpiresAt();
    dbSession.lastUsedAt = session.getLastUsedAt();
    dbSession.lastAccessExpiresAt = session.getLastAccessExpiresAt();
    dbSession.revokedAt = session.getRevokedAt();

    return dbSession;
  }
}
