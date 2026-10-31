import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { IsNull, type DataSource, type EntityManager } from "typeorm";

import type {
  IOAuthGrantStore,
  OAuthGrantContext,
  OAuthGrantPage,
  OAuthGrantSummary,
} from "@modules/oauth/application/port/oauth-grant-store";
import type { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import type { OAuthGrant, OAuthRefreshToken } from "@modules/oauth/domain/entity/oauth-grant";
import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbOAuthGrant } from "@modules/oauth/infrastructure/entity/db-oauth-grant.entity";
import { DbOAuthRefreshToken } from "@modules/oauth/infrastructure/entity/db-oauth-refresh-token.entity";
import { AuthorizationCodeMapper } from "@modules/oauth/infrastructure/mapper/authorization-code.mapper";
import { OAuthGrantMapper } from "@modules/oauth/infrastructure/mapper/oauth-grant.mapper";
import { OAuthRefreshTokenMapper } from "@modules/oauth/infrastructure/mapper/oauth-refresh-token.mapper";
import { AuthorizationCodeId, ClientId, OAuthGrantId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

export class DbOAuthGrantContext implements OAuthGrantContext {
  constructor(private readonly manager: EntityManager) {}

  async lockClient(id: ClientId): Promise<void> {
    await this.manager
      .getRepository(DbClient)
      .findOne({ where: { id: id.getValue() }, lock: { mode: "pessimistic_write" } });
  }

  async revokeByClientScopes(clientId: ClientId, scopes: string[], at: Date): Promise<void> {
    if (scopes.length === 0) return;

    const grants = await this.manager
      .getRepository(DbOAuthGrant)
      .createQueryBuilder("grant")
      .where("grant.clientId = :clientId", { clientId: clientId.getValue() })
      .andWhere("grant.revokedAt IS NULL")
      .andWhere("grant.scopes && CAST(:scopes AS text[])", { scopes })
      .orderBy("grant.id", "ASC")
      .setLock("pessimistic_write")
      .getMany();

    for (const grant of grants) {
      await this.revokeGrant(OAuthGrantId.from(grant.id), at);
    }
  }

  async lockAuthorizationCode(id: AuthorizationCodeId): Promise<AuthorizationCode | null> {
    const code = await this.manager
      .getRepository(DbAuthorizationCode)
      .findOne({ where: { id: id.getValue() }, lock: { mode: "pessimistic_write" } });

    return code === null ? null : AuthorizationCodeMapper.toDomain(code);
  }

  async consumeAuthorizationCode(id: AuthorizationCodeId): Promise<void> {
    await this.manager.getRepository(DbAuthorizationCode).update(id.getValue(), { isUsed: true });
  }

  async findGrant(id: OAuthGrantId, lock = false): Promise<OAuthGrant | null> {
    const grant = await this.manager
      .getRepository(DbOAuthGrant)
      .findOne({ where: { id: id.getValue() }, ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}) });

    return grant === null ? null : OAuthGrantMapper.toDomain(grant);
  }

  async saveGrant(grant: OAuthGrant): Promise<void> {
    await this.manager.getRepository(DbOAuthGrant).save(OAuthGrantMapper.toPersistence(grant));
  }

  async findRefreshToken(tokenHash: string): Promise<OAuthRefreshToken | null> {
    const token = await this.manager.getRepository(DbOAuthRefreshToken).findOneBy({ tokenHash });

    return token === null ? null : OAuthRefreshTokenMapper.toDomain(token);
  }

  async saveRefreshToken(token: OAuthRefreshToken): Promise<void> {
    await this.manager.getRepository(DbOAuthRefreshToken).save(OAuthRefreshTokenMapper.toPersistence(token));
  }

  async revokeGrant(id: OAuthGrantId, at: Date): Promise<void> {
    await this.manager
      .getRepository(DbOAuthGrant)
      .update({ id: id.getValue(), revokedAt: IsNull() }, { revokedAt: at });
    await this.manager
      .getRepository(DbOAuthRefreshToken)
      .update({ grantId: id.getValue(), revokedAt: IsNull() }, { revokedAt: at });
  }
}
@Injectable()
export class DbOAuthGrantStore extends DbOAuthGrantContext implements IOAuthGrantStore {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {
    super(dataSource.manager);
  }

  transaction<T>(work: (context: OAuthGrantContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) => work(new DbOAuthGrantContext(manager)));
  }

  async listByUserId(userId: UserId, limit: number, offset: number): Promise<OAuthGrantPage> {
    const query = this.dataSource
      .getRepository(DbOAuthGrant)
      .createQueryBuilder("grant")
      .innerJoin(DbClient, "client", "client.id = grant.clientId")
      .where("grant.userId = :userId", { userId: userId.getValue() });
    const [items, total] = await Promise.all([
      query
        .clone()
        .select("grant.id", "id")
        .addSelect("grant.clientId", "clientId")
        .addSelect("client.name", "clientName")
        .addSelect("grant.scopes", "scopes")
        .addSelect("grant.createdAt", "createdAt")
        .addSelect("grant.expiresAt", "expiresAt")
        .addSelect("grant.revokedAt", "revokedAt")
        .orderBy("grant.createdAt", "DESC")
        .addOrderBy("grant.id", "DESC")
        .limit(limit)
        .offset(offset)
        .getRawMany<Omit<OAuthGrantSummary, "id" | "clientId"> & { id: string; clientId: string }>(),
      query.clone().getCount(),
    ]);

    return {
      items: items.map((item) => ({ ...item, id: OAuthGrantId.from(item.id), clientId: ClientId.from(item.clientId) })),
      total,
    };
  }
}
