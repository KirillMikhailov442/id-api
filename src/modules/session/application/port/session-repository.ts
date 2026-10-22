import type { Session } from "@modules/session/domain/entity/session";
import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";

import type { IRepository } from "@core/shared/domain/repository.type";

export interface ISessionRepository extends IRepository<Session, string> {
  findByRefreshHash(refreshHash: RefreshHash): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  findByFamilyId(familyId: string): Promise<Session[]>;
  revokeAllInFamily(familyId: string, revokedAt: Date): Promise<void>;
  revokeAllByUserId(userId: string, revokedAt: Date): Promise<void>;
}
