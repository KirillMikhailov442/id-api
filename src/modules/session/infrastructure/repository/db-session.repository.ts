import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { PaginationQuery } from "@shared/pagination/pagination.query";
import { IsNull, MoreThan, Raw, type Repository } from "typeorm";

import type {
  ISessionRepository,
  SessionPage,
  SessionPageFilter,
} from "@modules/session/application/port/session-repository";
import type { ISessionRevocationStore } from "@modules/session/application/port/session-revocation-store.type";
import type { Session } from "@modules/session/domain/entity/session";
import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { DbSessionRefreshToken } from "@modules/session/infrastructure/entity/db-session-refresh-token.entity";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { SessionMapper } from "@modules/session/infrastructure/mapper/session.mapper";
import { SessionId, SessionRefreshTokenId } from "@modules/session/session.ids";
import { SESSION_REVOCATION_STORE } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

export class DbSessionRepository implements ISessionRepository {
  private pendingRevocations:
    | {
        id: SessionId;
        version: number;
        expiresAt: Date;
      }[]
    | null = null;

  constructor(
    @InjectRepository(DbSession)
    private readonly sessionRepository: Repository<DbSession>,
    @Inject(SESSION_REVOCATION_STORE)
    private readonly revocationStore: ISessionRevocationStore
  ) {}

  async withUserLock<T>(userId: UserId, work: (repository: ISessionRepository) => Promise<T>): Promise<T> {
    const pending: {
      id: SessionId;
      version: number;
      expiresAt: Date;
    }[] = [];
    const result = await this.sessionRepository.manager.transaction(async (manager) => {
      await manager.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [userId.getValue()]);

      const repository = new DbSessionRepository(manager.getRepository(DbSession), this.revocationStore);
      repository.pendingRevocations = pending;

      return work(repository);
    });

    for (const item of pending) {
      await this.revocationStore.revokeThrough(item.id, item.version, item.expiresAt);
    }

    return result;
  }

  async findById(id: SessionId): Promise<Session | null> {
    const dbSession = await this.sessionRepository.findOneBy({ id: id.getValue() });

    return dbSession === null ? null : SessionMapper.toDomain(dbSession);
  }

  async findByRefreshHash(refreshHash: RefreshHash): Promise<Session | null> {
    const token = await this.findRefreshToken(refreshHash);

    if (token === null) return null;

    const dbSession = await this.sessionRepository.findOneBy({ id: token.sessionId.getValue() });

    return dbSession === null ? null : SessionMapper.toDomain(dbSession);
  }

  async findRefreshToken(refreshHash: RefreshHash): ReturnType<ISessionRepository["findRefreshToken"]> {
    const token = await this.sessionRepository.manager
      .getRepository(DbSessionRefreshToken)
      .findOneBy({ tokenHash: refreshHash.getValue() });

    return token === null
      ? null
      : {
          sessionId: SessionId.from(token.sessionId),
          usedAt: token.usedAt,
          revokedAt: token.revokedAt,
          expiresAt: token.expiresAt,
        };
  }

  async createRefreshToken(session: Session, refreshHash: RefreshHash): Promise<void> {
    await this.sessionRepository.manager.getRepository(DbSessionRefreshToken).insert({
      id: SessionRefreshTokenId.create().getValue(),
      sessionId: session.getId().getValue(),
      tokenHash: refreshHash.getValue(),
      createdAt: new Date(),
      expiresAt: session.getExpiresAt(),
      usedAt: null,
      revokedAt: null,
    });
  }

  async findPageByUserId(
    userId: UserId,
    pagination: PaginationQuery,
    filter: SessionPageFilter = {}
  ): Promise<SessionPage> {
    const query = this.sessionRepository
      .createQueryBuilder("session")
      .where("session.userId = :userId", { userId: userId.getValue() });

    if (filter.activeOnly === true) {
      query.andWhere("session.revokedAt IS NULL").andWhere("session.expiresAt > :now", { now: new Date() });
    }

    const search = filter.search?.trim() ?? "";

    if (search.length > 0) {
      const escapedSearch = search.replace(/[\\%_]/g, "\\$&");
      query.andWhere(
        "(CAST(session.id AS text) ILIKE :search OR session.ip ILIKE :search OR session.browser ILIKE :search OR session.os ILIKE :search OR session.deviceType ILIKE :search)",
        { search: `%${escapedSearch}%` }
      );
    }

    if (filter.activeOnly === true) query.orderBy("session.lastUsedAt", "DESC");

    const [sessions, total] = await query
      .addOrderBy("session.createdAt", "DESC")
      .addOrderBy("session.id", "DESC")
      .skip(pagination.offset)
      .take(pagination.limit)
      .getManyAndCount();

    return { items: sessions.map((session) => SessionMapper.toDomain(session)), total };
  }

  async findByUserId(userId: UserId): Promise<Session[]> {
    const dbSessions = await this.sessionRepository.find({
      where: { userId: userId.getValue() },
      order: { createdAt: "DESC" },
    });

    return dbSessions.map(SessionMapper.toDomain);
  }

  async findActiveByUserId(userId: UserId): Promise<Session[]> {
    const dbSessions = await this.sessionRepository.find({
      where: { userId: userId.getValue(), revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { lastUsedAt: "DESC", createdAt: "DESC", id: "DESC" },
    });

    return dbSessions.map((dbSession) => SessionMapper.toDomain(dbSession));
  }

  async rotate(
    session: Session,
    expectedRefreshHash: RefreshHash,
    newRefreshHash: RefreshHash,
    previousAccessExpiresAt: Date
  ): Promise<boolean> {
    if (await this.revocationStore.isRevoked(session.getId(), session.getVersion() - 1)) {
      return false;
    }

    const consumed = await this.sessionRepository.manager.getRepository(DbSessionRefreshToken).update(
      {
        sessionId: session.getId().getValue(),
        tokenHash: expectedRefreshHash.getValue(),
        usedAt: IsNull(),
        revokedAt: IsNull(),
        expiresAt: Raw((alias) => `${alias} > CURRENT_TIMESTAMP`),
      },
      { usedAt: new Date() }
    );

    if (consumed.affected !== 1) return false;

    const dbSession = SessionMapper.toPersistence(session);
    const result = await this.sessionRepository.update(
      {
        id: dbSession.id,
        revokedAt: IsNull(),
        expiresAt: Raw((alias) => `${alias} > CURRENT_TIMESTAMP`),
      },
      {
        browser: dbSession.browser,
        os: dbSession.os,
        deviceType: dbSession.deviceType,
        ip: dbSession.ip,
        expiresAt: dbSession.expiresAt,
        lastUsedAt: dbSession.lastUsedAt,
        lastAccessExpiresAt: dbSession.lastAccessExpiresAt,
      }
    );

    if (result.affected !== 1) {
      return false;
    }

    await this.createRefreshToken(session, newRefreshHash);
    await this.recordRevocation(session.getId(), session.getVersion() - 1, previousAccessExpiresAt);

    return true;
  }

  async save(session: Session): Promise<void> {
    const dbSession = SessionMapper.toPersistence(session);
    await this.sessionRepository.save(dbSession);
  }

  async delete(id: SessionId): Promise<void> {
    const session = await this.findById(id);

    if (session === null) {
      return;
    }

    await this.sessionRepository.delete(id.getValue());
    await this.recordRevocation(id, session.getVersion(), session.getLastAccessExpiresAt());
  }

  async revokeById(id: SessionId, revokedAt: Date): Promise<void> {
    const session = await this.findById(id);

    if (session === null) {
      return;
    }

    await this.sessionRepository.update({ id: id.getValue(), revokedAt: IsNull() }, { revokedAt });
    await this.revokeRefreshTokens(id, revokedAt);
    await this.recordRevocation(id, session.getVersion(), session.getLastAccessExpiresAt());
  }

  async revokeByIdAndUserId(id: SessionId, userId: UserId, revokedAt: Date): Promise<boolean> {
    const dbSession = await this.sessionRepository.findOneBy({ id: id.getValue(), userId: userId.getValue() });

    if (dbSession === null) {
      return false;
    }

    await this.sessionRepository.update(
      { id: id.getValue(), userId: userId.getValue(), revokedAt: IsNull() },
      { revokedAt }
    );
    await this.revokeRefreshTokens(id, revokedAt);
    await this.recordRevocation(id, dbSession.refreshTokenCount, dbSession.lastAccessExpiresAt);

    return true;
  }

  async revokeAllByUserId(userId: UserId, revokedAt: Date): Promise<void> {
    const sessions = await this.sessionRepository.find({ where: { userId: userId.getValue() } });
    await this.sessionRepository.update({ userId: userId.getValue(), revokedAt: IsNull() }, { revokedAt });

    for (const session of sessions) {
      await this.revokeRefreshTokens(SessionId.from(session.id), revokedAt);
      await this.recordRevocation(SessionId.from(session.id), session.refreshTokenCount, session.lastAccessExpiresAt);
    }
  }

  private async recordRevocation(id: SessionId, version: number, expiresAt: Date): Promise<void> {
    if (this.pendingRevocations !== null) {
      this.pendingRevocations.push({ id, version, expiresAt });
    } else {
      await this.revocationStore.revokeThrough(id, version, expiresAt);
    }
  }

  private async revokeRefreshTokens(sessionId: SessionId, revokedAt: Date): Promise<void> {
    await this.sessionRepository.manager
      .getRepository(DbSessionRefreshToken)
      .update({ sessionId: sessionId.getValue(), revokedAt: IsNull() }, { revokedAt });
  }
}
