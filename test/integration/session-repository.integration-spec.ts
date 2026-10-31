import { databaseFixture, eventually, redisFixture } from "@test/integration/support";

import { Session } from "@modules/session/domain/entity/session";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { DbSessionRefreshToken } from "@modules/session/infrastructure/entity/db-session-refresh-token.entity";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { DbSessionRepository } from "@modules/session/infrastructure/repository/db-session.repository";
import { RedisSessionRevocationStore } from "@modules/session/infrastructure/security/redis/redis-session-revocation.store";
import { SessionId } from "@modules/session/session.ids";
import { makeUser } from "@modules/user/application/handler/user-test.spec-support";
import { UserId } from "@modules/user/user.ids";

describe("Session persistence, rotation and revocation (PostgreSQL + Redis)", () => {
  let db: Awaited<ReturnType<typeof databaseFixture>>;
  let redis: Awaited<ReturnType<typeof redisFixture>>;
  let repository: DbSessionRepository;
  let revocations: RedisSessionRevocationStore;
  let user: ReturnType<typeof makeUser>;
  let session: Session;
  const original = new RefreshHash("original-hash");

  beforeAll(async () => {
    db = await databaseFixture();
    redis = await redisFixture();
    revocations = new RedisSessionRevocationStore(redis.connection);
    repository = new DbSessionRepository(db.source.getRepository(DbSession), revocations);
  });

  beforeEach(async () => {
    await db.reset();
    user = makeUser();
    await db.users.run(({ userRepository }) => userRepository.save(user));
    session = Session.create({
      userId: user.getId(),
      browser: null,
      os: null,
      deviceType: null,
      ip: new Ip("::1"),
      expiresAt: new Date(Date.now() + 60000),
    });
    session.recordAccessToken(new Date(Date.now() + 30000));
    redis.track(`revoked-access:${session.getId().getValue()}`);
    await repository.withUserLock(user.getId(), async (locked) => {
      await locked.save(session);
      await locked.createRefreshToken(session, original);
    });
  });

  afterAll(async () => {
    await redis?.close();
    await db?.close();
  });

  it("loads sessions and their version from refresh history", async () => {
    const loaded = await repository.findById(session.getId());
    expect(loaded?.getVersion()).toBe(1);
    expect(loaded?.getIp().getValue()).toBe("::1");
    expect((await repository.findByRefreshHash(original))?.getId()).toEqual(session.getId());
    expect(await repository.findRefreshToken(original)).toMatchObject({
      sessionId: session.getId(),
      usedAt: null,
      revokedAt: null,
    });
    expect(await repository.findById(SessionId.create())).toBeNull();
    expect(await repository.findRefreshToken(new RefreshHash("missing"))).toBeNull();
    expect(await repository.findByRefreshHash(new RefreshHash("missing"))).toBeNull();
  });

  async function rotate(next: RefreshHash) {
    return repository.withUserLock(user.getId(), async (locked) => {
      const loaded = await locked.findById(session.getId());

      if (loaded === null) throw new Error("Session missing");

      const previous = loaded.getLastAccessExpiresAt();
      loaded.rotate({
        browser: null,
        os: null,
        deviceType: null,
        ip: new Ip("127.0.0.1"),
        expiresAt: new Date(Date.now() + 120000),
        now: new Date(),
      });
      loaded.recordAccessToken(new Date(Date.now() + 45000));

      return locked.rotate(loaded, original, next, previous);
    });
  }

  it("rotates once, keeps used-token history and revokes only the previous access version", async () => {
    const next = new RefreshHash("new-hash");
    expect(await rotate(next)).toBe(true);
    expect((await repository.findById(session.getId()))?.getVersion()).toBe(2);
    expect((await repository.findRefreshToken(original))?.usedAt).toBeInstanceOf(Date);
    expect(await repository.findRefreshToken(next)).toMatchObject({ usedAt: null, revokedAt: null });
    expect(await revocations.isRevoked(session.getId(), 1)).toBe(true);
    expect(await revocations.isRevoked(session.getId(), 2)).toBe(false);
    expect(await rotate(new RefreshHash("replay-hash"))).toBe(false);
    expect(await repository.findRefreshToken(new RefreshHash("replay-hash"))).toBeNull();
  });

  it("allows exactly one concurrent rotation of the same refresh token", async () => {
    const results = await Promise.all([rotate(new RefreshHash("first-hash")), rotate(new RefreshHash("second-hash"))]);
    expect(results.sort()).toEqual([false, true]);
    expect((await repository.findById(session.getId()))?.getVersion()).toBe(2);
    expect(await db.source.getRepository(DbSessionRefreshToken).count()).toBe(2);
  });

  it("rolls back consumption and publishes no revocation if replacement insertion violates uniqueness", async () => {
    await expect(rotate(original)).rejects.toMatchObject({
      code: "23505",
      constraint: "UQ_0c088f7a31f53d7421702ba7f2e",
    });
    expect((await repository.findRefreshToken(original))?.usedAt).toBeNull();
    expect((await repository.findById(session.getId()))?.getVersion()).toBe(1);
    expect(await revocations.isRevoked(session.getId(), 1)).toBe(false);
  });

  it.each(["expired", "revoked", "cache revoked"])("does not rotate an %s refresh token", async (state) => {
    if (state === "expired")
      await db.source
        .getRepository(DbSessionRefreshToken)
        .update({ sessionId: session.getId().getValue() }, { expiresAt: new Date(Date.now() - 1000) });

    if (state === "revoked")
      await db.source
        .getRepository(DbSessionRefreshToken)
        .update({ sessionId: session.getId().getValue() }, { revokedAt: new Date() });

    if (state === "cache revoked")
      await revocations.revokeThrough(session.getId(), 1, session.getLastAccessExpiresAt());

    expect(await rotate(new RefreshHash("replacement"))).toBe(false);
    expect(await repository.findRefreshToken(new RefreshHash("replacement"))).toBeNull();
  });

  it("publishes revocation after commit and revokes all refresh history", async () => {
    const at = new Date();
    await repository.withUserLock(user.getId(), async (locked) => {
      await locked.revokeById(session.getId(), at);
      expect(await revocations.isRevoked(session.getId(), 1)).toBe(false);
      expect((await repository.findById(session.getId()))?.isRevoked()).toBe(false);
    });
    expect((await repository.findById(session.getId()))?.getRevokedAt()).toEqual(at);
    expect((await repository.findRefreshToken(original))?.revokedAt).toEqual(at);
    expect(await revocations.isRevoked(session.getId(), 1)).toBe(true);
  });

  it("rolls back revocation and leaves Redis unchanged when work fails", async () => {
    const error = new Error("Abort transaction");
    await expect(
      repository.withUserLock(user.getId(), async (locked) => {
        await locked.revokeById(session.getId(), new Date());
        throw error;
      })
    ).rejects.toBe(error);
    expect((await repository.findById(session.getId()))?.isRevoked()).toBe(false);
    expect((await repository.findRefreshToken(original))?.revokedAt).toBeNull();
    expect(await revocations.isRevoked(session.getId(), 1)).toBe(false);
  });

  it("refuses another user's revoke and preserves the first revocation timestamp", async () => {
    const at = new Date(Date.now() - 1000);
    expect(await repository.revokeByIdAndUserId(session.getId(), UserId.create(), at)).toBe(false);
    expect((await repository.findById(session.getId()))?.isRevoked()).toBe(false);
    expect(await repository.revokeByIdAndUserId(session.getId(), user.getId(), at)).toBe(true);
    expect(await repository.revokeByIdAndUserId(session.getId(), user.getId(), new Date())).toBe(true);
    expect((await repository.findById(session.getId()))?.getRevokedAt()).toEqual(at);
  });

  it("lists only active sessions for the requested user ordered by last use", async () => {
    const second = Session.create({
      userId: user.getId(),
      browser: null,
      os: null,
      deviceType: null,
      ip: new Ip("unknown"),
      expiresAt: new Date(Date.now() + 60000),
    });
    await repository.save(second);
    await db.source.getRepository(DbSession).update(session.getId().getValue(), { lastUsedAt: new Date("2020-01-01") });
    expect((await repository.findActiveByUserId(user.getId())).map((item) => item.getId())).toEqual([
      second.getId(),
      session.getId(),
    ]);
    await db.source
      .getRepository(DbSession)
      .update(second.getId().getValue(), { expiresAt: new Date(Date.now() - 1000) });
    expect((await repository.findActiveByUserId(user.getId())).map((item) => item.getId())).toEqual([session.getId()]);
    expect(await repository.findActiveByUserId(UserId.create())).toEqual([]);
    expect(await repository.findByUserId(user.getId())).toHaveLength(2);
    await repository.revokeAllByUserId(user.getId(), new Date());
    redis.track(`revoked-access:${second.getId().getValue()}`);
    expect(await repository.findActiveByUserId(user.getId())).toEqual([]);
    expect(await revocations.isRevoked(session.getId(), 1)).toBe(true);
  });

  it("deletes session refresh history and revokes issued access", async () => {
    await repository.delete(session.getId());
    expect(await repository.findById(session.getId())).toBeNull();
    expect(await repository.findRefreshToken(original)).toBeNull();
    expect(await revocations.isRevoked(session.getId(), 1)).toBe(true);
    await expect(repository.delete(session.getId())).resolves.toBeUndefined();
  });

  it("holds a per-user advisory lock until transaction end", async () => {
    let release: () => void = () => undefined;
    let entered: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const first = repository.withUserLock(user.getId(), async () => {
      entered();
      await gate;
    });
    await ready;

    const second = repository.withUserLock(user.getId(), async () => "second");
    const observed = second.then(
      (value) => ({ value }),
      (error) => ({ error: error as unknown })
    );

    try {
      await eventually(async () => {
        const rows = await db.source.query<{ count: number }[]>(
          "SELECT COUNT(*)::integer AS count FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND classid=((hashtextextended($1, 0) >> 32) & 4294967295)::oid AND objid=(hashtextextended($1, 0) & 4294967295)::oid",
          [user.getId().getValue()]
        );
        expect(rows[0].count).toBeGreaterThan(0);
      });
    } finally {
      release();
      await first;
    }

    expect(await observed).toEqual({ value: "second" });
  });
});
