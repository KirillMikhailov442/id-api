import { Inject, Injectable } from "@nestjs/common";

import type { IOAuthRevocationStore } from "@modules/oauth/application/port/oauth-revocation-store";
import { OAuthGrantId } from "@modules/oauth/oauth.ids";

import { RedisConnection } from "@config/redis";

@Injectable()
export class RedisOAuthRevocationStore implements IOAuthRevocationStore {
  constructor(
    @Inject(RedisConnection)
    private readonly redis: RedisConnection
  ) {}

  async revoke(id: OAuthGrantId, expiresAt: Date): Promise<void> {
    const ttl = expiresAt.getTime() - Date.now();

    if (ttl > 0) await this.redis.execute((client) => client.set(`oauth:revoked:${id.getValue()}`, "1", { PX: ttl }));
  }

  async isRevoked(id: OAuthGrantId): Promise<boolean> {
    return (await this.redis.execute((client) => client.get(`oauth:revoked:${id.getValue()}`))) !== null;
  }
}
