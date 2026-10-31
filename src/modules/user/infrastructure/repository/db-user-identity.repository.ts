import type { Repository } from "typeorm";

import type { IUserIdentityRepository } from "@modules/user/application/port/user-identity-repository.type";
import type { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";
import type { DbUserIdentity } from "@modules/user/infrastructure/entity/db-user-identity.entity";
import { UserId } from "@modules/user/user.ids";

export class DbUserIdentityRepository implements IUserIdentityRepository {
  constructor(private readonly repository: Repository<DbUserIdentity>) {}

  async lock(provider: IdentityProvider, providerUserId: string): Promise<void> {
    await this.repository.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      `${provider}:${providerUserId}`,
    ]);
  }

  async findUserId(provider: IdentityProvider, providerUserId: string): Promise<UserId | null> {
    const identity = await this.repository.findOneBy({ provider, providerUserId });

    return identity === null ? null : UserId.from(identity.userId);
  }

  async save(provider: IdentityProvider, providerUserId: string, userId: UserId): Promise<void> {
    await this.repository.insert({ provider, providerUserId, userId: userId.getValue() });
  }
}
