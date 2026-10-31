import { createHash, randomUUID } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eventually, redisFixture } from "@test/integration/support";

import { RedisOAuthRevocationStore } from "@modules/oauth/infrastructure/security/redis-oauth-revocation.store";
import { OAuthGrantId } from "@modules/oauth/oauth.ids";
import { RedisLoginAttemptStore } from "@modules/session/infrastructure/security/redis/redis-login-attempt.store";
import { RedisSessionRevocationStore } from "@modules/session/infrastructure/security/redis/redis-session-revocation.store";
import { SessionId } from "@modules/session/session.ids";

import { RedisConnection } from "@config/redis";

describe("Revocation and login attempt stores (Redis)", () => {
  let redis: Awaited<ReturnType<typeof redisFixture>>;
  let sessions: RedisSessionRevocationStore;
  let oauth: RedisOAuthRevocationStore;
  let attempts: RedisLoginAttemptStore;

  beforeAll(async () => {
    redis = await redisFixture();
    sessions = new RedisSessionRevocationStore(redis.connection);
    oauth = new RedisOAuthRevocationStore(redis.connection);
    attempts = new RedisLoginAttemptStore(redis.connection, new ConfigService({ EXTERNAL_LOGIN_TTL: 1 }));
  });

  afterAll(async () => {
    await redis?.close();
  });

  function sessionKey(id: SessionId) {
    return redis.track(`revoked-access:${id.getValue()}`);
  }

  function grantKey(id: OAuthGrantId) {
    return redis.track(`oauth:revoked:${id.getValue()}`);
  }

  function attemptKey(state: string, binding: string) {
    return redis.track(`auth:google:attempt:${createHash("sha256").update(`${state}:${binding}`).digest("hex")}`);
  }

  it("revokes only session versions through the stored version", async () => {
    const id = SessionId.create();
    sessionKey(id);
    expect(await sessions.isRevoked(id, 1)).toBe(false);
    await sessions.revokeThrough(id, 3, new Date(Date.now() + 10000));
    expect(await sessions.isRevoked(id, 1)).toBe(true);
    expect(await sessions.isRevoked(id, 3)).toBe(true);
    expect(await sessions.isRevoked(id, 4)).toBe(false);
  });

  it("atomically preserves the highest version and longest TTL under competing revocations", async () => {
    const id = SessionId.create();
    const key = sessionKey(id);
    const latestExpiry = Date.now() + 30000;
    await Promise.all([
      sessions.revokeThrough(id, 7, new Date(Date.now() + 5000)),
      sessions.revokeThrough(id, 2, new Date(latestExpiry)),
      sessions.revokeThrough(id, 5, new Date(Date.now() + 10000)),
    ]);
    expect(await redis.connection.execute((client) => client.get(key))).toBe("7");
    expect(await redis.connection.execute((client) => client.pExpireTime(key))).toBe(latestExpiry);
  });

  it("keeps permanent legacy revocation entries permanent while advancing their version", async () => {
    const id = SessionId.create();
    const key = sessionKey(id);
    await redis.connection.execute((client) => client.set(key, "2"));
    await sessions.revokeThrough(id, 3, new Date(Date.now() + 10000));
    expect(await redis.connection.execute((client) => client.get(key))).toBe("3");
    expect(await redis.connection.execute((client) => client.pTTL(key))).toBe(-1);
  });

  it("expires session revocations at their absolute deadline", async () => {
    const id = SessionId.create();
    const key = sessionKey(id);
    const expiry = Date.now() + 250;
    await sessions.revokeThrough(id, 1, new Date(expiry));
    expect(await sessions.isRevoked(id, 1)).toBe(true);
    expect(await redis.connection.execute((client) => client.pExpireTime(key))).toBe(expiry);
    await eventually(async () => {
      expect(await sessions.isRevoked(id, 1)).toBe(false);
    });
  });

  it("does not create already expired revocation entries", async () => {
    const session = SessionId.create();
    const grant = OAuthGrantId.create();
    const key = sessionKey(session);
    const otherKey = grantKey(grant);
    await sessions.revokeThrough(session, 1, new Date(Date.now() - 1000));
    await oauth.revoke(grant, new Date(Date.now() - 1000));
    expect(await redis.connection.execute((client) => client.mGet([key, otherKey]))).toEqual([null, null]);
  });

  it.each(["revoked-session", "revoked-access"])("honors %s legacy entries", async (prefix) => {
    const id = SessionId.create();
    const key = redis.track(
      prefix === "revoked-session" ? `${prefix}:${id.getValue()}` : `${prefix}:${id.getValue()}:2`
    );
    await redis.connection.execute((client) => client.set(key, "1", { EX: 10 }));
    expect(await sessions.isRevoked(id, 2)).toBe(true);
    expect(await sessions.isRevoked(id, 3)).toBe(prefix === "revoked-session");
  });

  it.each(["invalid", "0", "-1", "1.5", "9007199254740992"])(
    "fails closed for malformed stored version %p",
    async (value) => {
      const id = SessionId.create();
      const key = sessionKey(id);
      await redis.connection.execute((client) => client.set(key, value, { EX: 10 }));
      expect(await sessions.isRevoked(id, 10)).toBe(true);
    }
  );

  it("stores and expires OAuth grant revocations", async () => {
    const id = OAuthGrantId.create();
    const key = grantKey(id);
    expect(await oauth.isRevoked(id)).toBe(false);
    await oauth.revoke(id, new Date(Date.now() + 250));
    expect(await oauth.isRevoked(id)).toBe(true);

    const ttl = await redis.connection.execute((client) => client.pTTL(key));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(250);
    await eventually(async () => {
      expect(await oauth.isRevoked(id)).toBe(false);
    });
  });

  it("binds a login attempt to both state and browser, without consuming it on mismatches", async () => {
    const state = randomUUID();
    const binding = randomUUID();
    attemptKey(state, binding);

    const attempt = { nonce: "nonce", codeVerifier: "verifier" };
    await attempts.save(state, binding, attempt);
    expect(await attempts.consume(state, "wrong-browser")).toBeNull();
    expect(await attempts.consume("wrong-state", binding)).toBeNull();
    expect(await attempts.consume(state, binding)).toEqual(attempt);
    expect(await attempts.consume(state, binding)).toBeNull();
  });

  it("consumes login attempts atomically so exactly one concurrent callback wins", async () => {
    const state = randomUUID();
    const binding = randomUUID();
    attemptKey(state, binding);

    const attempt = { nonce: "nonce", codeVerifier: "verifier" };
    await attempts.save(state, binding, attempt);

    const results = await Promise.all(Array.from({ length: 8 }, () => attempts.consume(state, binding)));
    expect(results.filter((value) => value !== null)).toEqual([attempt]);
    expect(results.filter((value) => value === null)).toHaveLength(7);
  });

  it("expires unconsumed login attempts according to configured TTL", async () => {
    const state = randomUUID();
    const binding = randomUUID();
    const key = attemptKey(state, binding);
    await attempts.save(state, binding, { nonce: "nonce", codeVerifier: "verifier" });

    const ttl = await redis.connection.execute((client) => client.pTTL(key));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(1000);
    await eventually(async () => {
      expect(await redis.connection.execute((client) => client.exists(key))).toBe(0);
    });
    expect(await attempts.consume(state, binding)).toBeNull();
  });

  it("turns actual Redis command errors into ServiceUnavailableException", async () => {
    const key = redis.track(`wrongtype:${randomUUID()}`);
    await redis.connection.execute((client) => client.lPush(key, "item"));
    await expect(redis.connection.execute((client) => client.get(key))).rejects.toThrow(ServiceUnavailableException);
  });

  it("fails closed when the connection has been destroyed", async () => {
    const url = process.env.INTEGRATION_REDIS_URL;
    const connection = new RedisConnection(
      new ConfigService({ REDIS_URL: url, REDIS_COMMAND_TIMEOUT: 1000, REDIS_CONNECT_TIMEOUT: 1000 })
    );
    await connection.onModuleInit();
    connection.onModuleDestroy();
    await expect(new RedisOAuthRevocationStore(connection).isRevoked(OAuthGrantId.create())).rejects.toThrow(
      ServiceUnavailableException
    );
  });
});
