import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, type Repository } from "typeorm";

import type { ISessionRepository } from "@modules/auth/application/port/session-repository";
import type { Session } from "@modules/auth/domain/entity/session";
import type { RefreshHash } from "@modules/auth/domain/value-object/refresh-hash.value-object";
import { DbSession } from "@modules/auth/infrastructure/entity/db-session.entity";
import { SessionMapper } from "@modules/auth/infrastructure/mapper/session.mapper";

export class DbSessionRepository implements ISessionRepository {
  constructor(@InjectRepository(DbSession) private readonly sessionRepository: Repository<DbSession>) {}

  async findById(id: string): Promise<Session | null> {
    const dbSession = await this.sessionRepository.findOneBy({ id });

    return dbSession === null ? null : SessionMapper.toDomain(dbSession);
  }

  async findByRefreshHash(refreshHash: RefreshHash): Promise<Session | null> {
    const dbSession = await this.sessionRepository.findOneBy({
      refreshHash: refreshHash.getValue(),
    });

    return dbSession === null ? null : SessionMapper.toDomain(dbSession);
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const dbSessions = await this.sessionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });

    return dbSessions.map(SessionMapper.toDomain);
  }

  async findByFamilyId(familyId: string): Promise<Session[]> {
    const dbSessions = await this.sessionRepository.find({
      where: { familyId },
      order: { createdAt: "DESC" },
    });

    return dbSessions.map(SessionMapper.toDomain);
  }

  async save(session: Session): Promise<void> {
    const dbSession = SessionMapper.toPersistence(session);

    await this.sessionRepository.save(dbSession);
  }

  async delete(id: string): Promise<void> {
    await this.sessionRepository.delete(id);
  }

  async revokeAllInFamily(familyId: string, revokedAt: Date): Promise<void> {
    await this.sessionRepository.update({ familyId, revokedAt: IsNull() }, { revokedAt });
  }

  async revokeAllByUserId(userId: string, revokedAt: Date): Promise<void> {
    await this.sessionRepository.update({ userId, revokedAt: IsNull() }, { revokedAt });
  }
}
