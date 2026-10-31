import { Inject, Injectable } from "@nestjs/common";

import type { ISessionRevocationStore } from "@modules/session/application/port/session-revocation-store.type";
import { SessionId } from "@modules/session/session.ids";

import { RedisConnection } from "@config/redis";

const REVOKE_SCRIPT = `
local version = tonumber(ARGV[1])
local expiresAt = tonumber(ARGV[2])
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
if expiresAt <= now then
  return 0
end
local currentVersion = tonumber(redis.call('GET', KEYS[1]) or '0')
local currentExpiry = redis.call('PEXPIRETIME', KEYS[1])
local revokedThrough = tostring(math.max(version, currentVersion))
if currentExpiry == -1 then
  redis.call('SET', KEYS[1], revokedThrough, 'KEEPTTL')
else
  redis.call('SET', KEYS[1], revokedThrough, 'PXAT', math.max(expiresAt, currentExpiry))
end
return 1
`;

@Injectable()
export class RedisSessionRevocationStore implements ISessionRevocationStore {
  constructor(@Inject(RedisConnection) private readonly connection: RedisConnection) {}

  async revokeThrough(sessionId: SessionId, version: number, expiresAt: Date): Promise<void> {
    if (expiresAt.getTime() <= Date.now()) {
      return;
    }

    await this.connection.execute((client) =>
      client.eval(REVOKE_SCRIPT, {
        keys: [this.key(sessionId)],
        arguments: [String(version), String(expiresAt.getTime())],
      })
    );
  }

  async isRevoked(sessionId: SessionId, version: number): Promise<boolean> {
    const [revokedThrough, legacySession, legacyAccess] = await this.connection.execute((client) =>
      client.mGet([
        this.key(sessionId),
        `revoked-session:${sessionId.getValue()}`,
        `revoked-access:${sessionId.getValue()}:${version}`,
      ])
    );

    if (legacySession !== null || legacyAccess !== null) {
      return true;
    }

    if (revokedThrough === null) {
      return false;
    }

    const maximumRevokedVersion = Number(revokedThrough);

    return (
      !Number.isSafeInteger(maximumRevokedVersion) || maximumRevokedVersion < 1 || version <= maximumRevokedVersion
    );
  }

  private key(sessionId: SessionId): string {
    return `revoked-access:${sessionId.getValue()}`;
  }
}
