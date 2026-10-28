import { DeviceInfo } from "@shared/domain/device-info";

import { Session } from "@modules/session/domain/entity/session";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";

export class SessionMapper {
  static toDomain(dbSession: DbSession): Session {
    return new Session(
      dbSession.id,
      dbSession.userId,
      new RefreshHash(dbSession.refreshHash),
      new DeviceInfo(dbSession.browser, dbSession.os, dbSession.deviceType),
      new Ip(dbSession.ip),
      dbSession.createdAt,
      dbSession.expiresAt,
      dbSession.lastUsedAt,
      dbSession.revokedAt
    );
  }

  static toPersistence(session: Session): DbSession {
    const dbSession = new DbSession();

    dbSession.id = session.getId();
    dbSession.userId = session.getUserId();
    dbSession.refreshHash = session.getRefreshHash().getValue();
    const deviceInfo = session.getDeviceInfo();
    dbSession.browser = deviceInfo.browser;
    dbSession.os = deviceInfo.os;
    dbSession.deviceType = deviceInfo.deviceType;
    dbSession.ip = session.getIp().getValue();
    dbSession.createdAt = session.getCreatedAt();
    dbSession.expiresAt = session.getExpiresAt();
    dbSession.lastUsedAt = session.getLastUsedAt();
    dbSession.revokedAt = session.getRevokedAt();

    return dbSession;
  }
}
