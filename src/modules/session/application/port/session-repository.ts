import type { IRepository } from "@shared/domain/repository.type";

import type { Session } from "@modules/session/domain/entity/session";
import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";

export interface ISessionRepository extends IRepository<Session, string> {
  findByRefreshHash(refreshHash: RefreshHash): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  rotate(session: Session, expectedRefreshHash: RefreshHash): Promise<boolean>;
  revokeById(id: string, revokedAt: Date): Promise<void>;
  revokeByIdAndUserId(id: string, userId: string, revokedAt: Date): Promise<boolean>;
  revokeAllByUserId(userId: string, revokedAt: Date): Promise<void>;
}
