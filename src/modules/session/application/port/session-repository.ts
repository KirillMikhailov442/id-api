import type { IRepository } from "@shared/repository/repository.type";

import type { Session } from "@modules/session/domain/entity/session";
import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import type { SessionId } from "@modules/session/session.ids";
import type { UserId } from "@modules/user/user.ids";

export interface ISessionRepository extends IRepository<Session, SessionId> {
  withUserLock<T>(userId: UserId, work: (repository: ISessionRepository) => Promise<T>): Promise<T>;
  findByRefreshHash(refreshHash: RefreshHash): Promise<Session | null>;
  findRefreshToken(refreshHash: RefreshHash): Promise<{
    sessionId: SessionId;
    usedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
  } | null>;
  createRefreshToken(session: Session, refreshHash: RefreshHash): Promise<void>;
  findByUserId(userId: UserId): Promise<Session[]>;
  findActiveByUserId(userId: UserId): Promise<Session[]>;
  rotate(
    session: Session,
    expectedRefreshHash: RefreshHash,
    newRefreshHash: RefreshHash,
    previousAccessExpiresAt: Date
  ): Promise<boolean>;
  revokeById(id: SessionId, revokedAt: Date): Promise<void>;
  revokeByIdAndUserId(id: SessionId, userId: UserId, revokedAt: Date): Promise<boolean>;
  revokeAllByUserId(userId: UserId, revokedAt: Date): Promise<void>;
}
