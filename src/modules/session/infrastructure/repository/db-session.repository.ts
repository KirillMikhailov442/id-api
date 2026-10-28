import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, type Repository } from "typeorm";

import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import type { Session } from "@modules/session/domain/entity/session";
import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { SessionMapper } from "@modules/session/infrastructure/mapper/session.mapper";

export class DbSessionRepository implements ISessionRepository {
  private readonly sessionRepository: Repository<DbSession>;

  constructor(
    @InjectRepository(DbSession)
    sessionRepository: Repository<DbSession>
  ) {
    this.sessionRepository = sessionRepository;
  }

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

  async rotate(session: Session, expectedRefreshHash: RefreshHash): Promise<boolean> {
    const dbSession = SessionMapper.toPersistence(session);
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(DbSession)
      .set({
        refreshHash: dbSession.refreshHash,
        browser: dbSession.browser,
        os: dbSession.os,
        deviceType: dbSession.deviceType,
        ip: dbSession.ip,
        expiresAt: dbSession.expiresAt,
        lastUsedAt: dbSession.lastUsedAt,
      })
      .where("id = :id", { id: dbSession.id })
      .andWhere("refresh_hash = :expectedRefreshHash", { expectedRefreshHash: expectedRefreshHash.getValue() })
      .andWhere("revoked_at IS NULL")
      .andWhere("expires_at > CURRENT_TIMESTAMP")
      .execute();
    return result.affected === 1;
  }

  async save(session: Session): Promise<void> {
    const dbSession = SessionMapper.toPersistence(session);
    await this.sessionRepository.save(dbSession);
  }

  async delete(id: string): Promise<void> {
    await this.sessionRepository.delete(id);
  }

  async revokeById(id: string, revokedAt: Date): Promise<void> {
    await this.sessionRepository.update({ id, revokedAt: IsNull() }, { revokedAt });
  }

  async revokeAllByUserId(userId: string, revokedAt: Date): Promise<void> {
    await this.sessionRepository.update({ userId, revokedAt: IsNull() }, { revokedAt });
  }
}
