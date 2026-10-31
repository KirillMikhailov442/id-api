import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { TokenHistoryCleanupService } from "@shared/scheduled-tasks/token-history-cleanup.service";
import { databaseFixture } from "@test/integration/support";

import { Client } from "@modules/oauth/domain/entity/client";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { DbOAuthGrant } from "@modules/oauth/infrastructure/entity/db-oauth-grant.entity";
import { DbOAuthRefreshToken } from "@modules/oauth/infrastructure/entity/db-oauth-refresh-token.entity";
import { DbSessionRefreshToken } from "@modules/session/infrastructure/entity/db-session-refresh-token.entity";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { makeUser } from "@modules/user/application/handler/user-test.spec-support";

describe("Token history retention (PostgreSQL)", () => {
  let db: Awaited<ReturnType<typeof databaseFixture>>;
  let service: TokenHistoryCleanupService;
  let user: ReturnType<typeof makeUser>;
  let client: Client;
  let now: Date;
  const day = 86400000;

  beforeAll(async () => {
    db = await databaseFixture();
  });

  beforeEach(async () => {
    await db.reset();
    now = new Date();
    jest.spyOn(Date, "now").mockReturnValue(now.getTime());
    user = makeUser();
    await db.users.run(({ userRepository }) => userRepository.save(user));
    client = Client.create({ userId: user.getId(), name: new ClientName("Cleanup app"), secretHash: "hash" });
    await db.clients.run(({ clientRepository }) => clientRepository.save(client));
    service = new TokenHistoryCleanupService(db.source, new ConfigService({ TOKEN_HISTORY_RETENTION_DAYS: 7 }));
  });

  afterEach(() => jest.restoreAllMocks());

  afterAll(async () => {
    await db?.close();
  });

  async function parent(
    kind: "session" | "oauth",
    expiryOffset: number,
    revokedOffset: number | null,
    accessOffset: number
  ) {
    const id = randomUUID();
    const dates = {
      createdAt: new Date(now.getTime() - 30 * day),
      expiresAt: new Date(now.getTime() + expiryOffset),
      revokedAt: revokedOffset === null ? null : new Date(now.getTime() + revokedOffset),
      lastAccessExpiresAt: new Date(now.getTime() + accessOffset),
    };

    if (kind === "session")
      await db.source.getRepository(DbSession).insert({
        id,
        userId: user.getId().getValue(),
        ...dates,
        browser: null,
        os: null,
        deviceType: null,
        ip: "unknown",
        lastUsedAt: dates.createdAt,
      });
    else
      await db.source.getRepository(DbOAuthGrant).insert({
        id,
        userId: user.getId().getValue(),
        clientId: client.getId().getValue(),
        scopes: ["offline_access"],
        audience: "api",
        ...dates,
      });

    return id;
  }

  async function tokens(kind: "session" | "oauth", parentId: string, count = 1) {
    const items = Array.from({ length: count }, () => ({
      id: randomUUID(),
      tokenHash: randomUUID().replaceAll("-", "").repeat(2),
      createdAt: new Date(now.getTime() - 30 * day),
      expiresAt: new Date(now.getTime() - 20 * day),
      usedAt: new Date(now.getTime() - 21 * day),
      revokedAt: null,
    }));

    if (kind === "session")
      await db.source
        .getRepository(DbSessionRefreshToken)
        .insert(items.map((item) => ({ ...item, sessionId: parentId })));
    else
      await db.source.getRepository(DbOAuthRefreshToken).insert(items.map((item) => ({ ...item, grantId: parentId })));

    return items;
  }

  async function count(kind: "session" | "oauth", parentId: string) {
    return kind === "session"
      ? db.source.getRepository(DbSessionRefreshToken).countBy({ sessionId: parentId })
      : db.source.getRepository(DbOAuthRefreshToken).countBy({ grantId: parentId });
  }

  describe.each(["session", "oauth"] as const)("%s history", (kind) => {
    it.each([
      { state: "expired beyond retention", expiry: -8 * day, revoked: null, access: -day, remaining: 0 },
      { state: "revoked beyond retention", expiry: day, revoked: -8 * day, access: -day, remaining: 0 },
      { state: "recently expired", expiry: -6 * day, revoked: null, access: -day, remaining: 1 },
      { state: "recently revoked", expiry: day, revoked: -6 * day, access: -day, remaining: 1 },
      { state: "expiry exactly at cutoff", expiry: -7 * day, revoked: null, access: -day, remaining: 1 },
      { state: "revocation exactly at cutoff", expiry: day, revoked: -7 * day, access: -day, remaining: 1 },
      { state: "old expiry with a live access token", expiry: -8 * day, revoked: null, access: day, remaining: 1 },
      { state: "old revocation with a live access token", expiry: day, revoked: -8 * day, access: day, remaining: 1 },
      { state: "active parent with old used refresh history", expiry: day, revoked: null, access: -day, remaining: 1 },
    ])("handles $state", async ({ expiry, revoked, access, remaining }) => {
      const id = await parent(kind, expiry, revoked, access);
      await tokens(kind, id);
      await service.cleanup();
      expect(await count(kind, id)).toBe(remaining);

      const entity =
        kind === "session"
          ? await db.source.getRepository(DbSession).findOneBy({ id })
          : await db.source.getRepository(DbOAuthGrant).findOneBy({ id });
      expect(entity).not.toBeNull();
    });

    it("deletes at most 1000 history rows per run and finishes on the next run", async () => {
      const id = await parent(kind, -8 * day, null, -day);
      await tokens(kind, id, 1001);
      await service.cleanup();
      expect(await count(kind, id)).toBe(1);
      await service.cleanup();
      expect(await count(kind, id)).toBe(0);
      await expect(service.cleanup()).resolves.toBeUndefined();
    });
  });

  it("cleans session and OAuth history during the same invocation", async () => {
    const session = await parent("session", -8 * day, null, -day);
    const grant = await parent("oauth", -8 * day, null, -day);
    await tokens("session", session);
    await tokens("oauth", grant);
    await service.cleanup();
    expect(await count("session", session)).toBe(0);
    expect(await count("oauth", grant)).toBe(0);
  });
});
