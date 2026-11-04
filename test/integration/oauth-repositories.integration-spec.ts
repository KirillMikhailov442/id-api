import { databaseFixture, verifyDatabaseLock } from "@test/integration/support";

import { makeClient, makeCode, makeScope } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import type { OAuthGrant, OAuthRefreshToken } from "@modules/oauth/domain/entity/oauth-grant";
import { ScopeAlreadyExistsException } from "@modules/oauth/domain/exception/scope-already-exists.exception";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbAuthorizationCodeRepository } from "@modules/oauth/infrastructure/repository/db-authorization-code.repository";
import { DbClientRepository } from "@modules/oauth/infrastructure/repository/db-client.repository";
import { DbOAuthGrantContext, DbOAuthGrantStore } from "@modules/oauth/infrastructure/repository/db-oauth-grant.store";
import { ClientId, OAuthGrantId, OAuthRefreshTokenId, ScopeId } from "@modules/oauth/oauth.ids";
import { makeUser } from "@modules/user/application/handler/user-test.spec-support";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { UserId } from "@modules/user/user.ids";

describe("OAuth repositories and transactions (PostgreSQL)", () => {
  let db: Awaited<ReturnType<typeof databaseFixture>>;
  let client: ReturnType<typeof makeClient>;
  let store: DbOAuthGrantStore;
  let codes: DbAuthorizationCodeRepository;

  beforeAll(async () => {
    db = await databaseFixture();
    store = new DbOAuthGrantStore(db.source);
    codes = new DbAuthorizationCodeRepository(db.source.getRepository(DbAuthorizationCode));
  });

  beforeEach(async () => {
    await db.reset();

    const user = makeUser();
    client = makeClient();
    // Preserve the owner's ID used by the client fixture.
    await db.source.getRepository(DbUser).insert({
      id: client.getUserId().getValue(),
      name: user.getName().getValue(),
      surname: user.getSurname().getValue(),
      email: user.getEmail().getValue(),
      avatar: user.getAvatar(),
      passwordHash: user.getPasswordHash(),
      emailConfirmed: false,
      blocked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.clients.run(({ clientRepository }) => clientRepository.save(client));
  });

  afterAll(async () => {
    await db?.close();
  });

  function grant(scopes = ["user:read"]): OAuthGrant {
    return {
      id: OAuthGrantId.create(),
      userId: client.getUserId(),
      clientId: client.getId(),
      scopes,
      audience: "api",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      lastAccessExpiresAt: new Date(Date.now() + 30000),
      revokedAt: null,
    };
  }

  function refresh(item: OAuthGrant): OAuthRefreshToken {
    return {
      id: OAuthRefreshTokenId.create(),
      grantId: item.id,
      tokenHash: OAuthRefreshTokenId.create().getValue().replaceAll("-", "").repeat(2),
      createdAt: new Date(),
      expiresAt: item.expiresAt,
      usedAt: null,
      revokedAt: null,
    };
  }

  it("persists client updates and paginates only the owner's clients", async () => {
    client.updateLocation(new LocationHref("https://app.example.com/callback"));
    await db.clients.run(async ({ clientRepository: clients }) => {
      await clients.save(client);
      expect((await clients.findById(client.getId()))?.getLocation()?.getValue()).toBe(
        "https://app.example.com/callback"
      );
      expect(await clients.count()).toBe(1);
      expect(await clients.countByUserId(client.getUserId())).toBe(1);
      expect(await clients.countByUserId(UserId.create())).toBe(0);
      expect(
        (await clients.findByUserId(client.getUserId(), { limit: 1, offset: 0 })).map((item) => item.getId())
      ).toEqual([client.getId()]);
      expect(await clients.findByUserId(UserId.create(), { limit: 1, offset: 0 })).toEqual([]);
      expect(await clients.findAll({ limit: 1, offset: 1 })).toEqual([]);
      expect(await clients.findById(ClientId.create())).toBeNull();
    });
  });

  it("stores scope assignments and removes them when a scope is deleted", async () => {
    const scope = makeScope();
    await db.clients.run(
      async ({ scopeRepository: scopes, clientScopeRepository: assignments, clientRepository: clients }) => {
        await scopes.save(scope);
        await assignments.save(new ClientScope(client.getId(), scope.getId(), new Date()));
        expect(await assignments.exists(client.getId(), scope.getId())).toBe(true);
        expect((await assignments.findByClientId(client.getId())).map((item) => item.getScopeId())).toEqual([
          scope.getId(),
        ]);
        expect((await scopes.findByName(new ScopeName("profile")))?.getId()).toEqual(scope.getId());
        expect((await scopes.findByIds([scope.getId()])).map((item) => item.getId())).toEqual([scope.getId()]);
        expect(await scopes.findByIds([])).toEqual([]);
        expect(await scopes.findById(ScopeId.create())).toBeNull();
        expect(await scopes.count()).toBe(1);
        expect(await scopes.findAll({ limit: 1, offset: 0 })).toHaveLength(1);

        const pagination = { limit: 1, offset: 0 };
        const fromDetails = await clients.findById(client.getId());
        const fromOwnList = await clients.findByUserId(client.getUserId(), pagination);
        const fromAllClients = await clients.findAll(pagination);

        expect(fromDetails?.getScopes()).toEqual([scope]);
        expect(fromOwnList[0]?.getScopes()).toEqual([scope]);
        expect(fromAllClients[0]?.getScopes()).toEqual([scope]);

        await scopes.delete(scope.getId());
        expect((await clients.findById(client.getId()))?.getScopes()).toEqual([]);
        expect(await assignments.findByClientId(client.getId())).toEqual([]);
      }
    );
  });

  it("maps the migration's real scope name constraint to a domain exception", async () => {
    await db.clients.run(({ scopeRepository }) => scopeRepository.save(makeScope()));
    await expect(db.clients.run(({ scopeRepository }) => scopeRepository.save(makeScope()))).rejects.toThrow(
      ScopeAlreadyExistsException
    );
  });

  it("deletes individual and all client scope assignments", async () => {
    await db.clients.run(async ({ scopeRepository, clientScopeRepository }) => {
      const first = makeScope("user:read");
      const second = makeScope("user:write");
      await scopeRepository.save(first);
      await scopeRepository.save(second);
      await clientScopeRepository.save(new ClientScope(client.getId(), first.getId(), new Date()));
      await clientScopeRepository.save(new ClientScope(client.getId(), second.getId(), new Date()));
      await clientScopeRepository.delete(client.getId(), first.getId());
      expect(await clientScopeRepository.exists(client.getId(), first.getId())).toBe(false);
      expect(await clientScopeRepository.exists(client.getId(), second.getId())).toBe(true);
      await clientScopeRepository.deleteByClientId(client.getId());
      expect(await clientScopeRepository.findByClientId(client.getId())).toEqual([]);
    });
  });

  it("rolls back client, scope, assignment and grant mutations together", async () => {
    const scope = makeScope();
    const error = new Error("Abort");
    const item = grant();
    await expect(
      db.clients.run(async ({ clientRepository, scopeRepository }) => {
        await clientRepository.delete(client.getId());
        await scopeRepository.save(scope);
        throw error;
      })
    ).rejects.toBe(error);
    expect(await new DbClientRepository(db.source.getRepository(DbClient)).findById(client.getId())).not.toBeNull();
    await expect(
      db.clients.run(async ({ scopeRepository, clientScopeRepository, oauthGrants }) => {
        await scopeRepository.save(scope);
        await clientScopeRepository.save(new ClientScope(client.getId(), scope.getId(), new Date()));
        await oauthGrants.saveGrant(item);
        throw error;
      })
    ).rejects.toBe(error);
    expect(await store.findGrant(item.id)).toBeNull();
    await db.clients.run(async ({ scopeRepository, clientScopeRepository }) => {
      expect(await scopeRepository.findById(scope.getId())).toBeNull();
      expect(await clientScopeRepository.findByClientId(client.getId())).toEqual([]);
    });
  });

  it("persists authorization codes and consumes them transactionally", async () => {
    const code = makeCode(client);
    await codes.save(code);
    expect((await codes.findByCodeHash(code.getCodeHash().getValue()))?.getId()).toEqual(code.getId());

    const error = new Error("Abort");
    await expect(
      store.transaction(async (context) => {
        await context.consumeAuthorizationCode(code.getId());
        throw error;
      })
    ).rejects.toBe(error);
    expect((await codes.findById(code.getId()))?.getIsUsed()).toBe(false);
    await store.transaction(async (context) => {
      expect((await context.lockAuthorizationCode(code.getId()))?.getIsUsed()).toBe(false);
      await context.consumeAuthorizationCode(code.getId());
    });
    expect((await codes.findById(code.getId()))?.getIsUsed()).toBe(true);
    await codes.delete(code.getId());
    expect(await codes.findByCodeHash(code.getCodeHash().getValue())).toBeNull();
  });

  it.each(["client repository", "client grant lock", "grant", "authorization code"])(
    "holds the %s row lock across concurrent transactions",
    async (kind) => {
      const item = grant();
      const code = makeCode(client);
      await store.saveGrant(item);
      await codes.save(code);
      await verifyDatabaseLock(db.source, (manager) => {
        const context = new DbOAuthGrantContext(manager);

        if (kind === "client repository")
          return new DbClientRepository(manager.getRepository(DbClient)).findByIdForUpdate(client.getId());

        if (kind === "client grant lock") return context.lockClient(client.getId());

        if (kind === "grant") return context.findGrant(item.id, true);

        return context.lockAuthorizationCode(code.getId());
      });
    }
  );

  it("enforces one current refresh per grant and allows replacement after consumption", async () => {
    const item = grant();
    const first = refresh(item);
    const second = refresh(item);
    await store.saveGrant(item);
    await store.saveRefreshToken(first);
    await expect(store.saveRefreshToken(second)).rejects.toMatchObject({ code: "23505" });
    first.usedAt = new Date();
    await store.saveRefreshToken(first);
    await store.saveRefreshToken(second);
    expect(await store.findRefreshToken(first.tokenHash)).toEqual(first);
    expect(await store.findRefreshToken(second.tokenHash)).toEqual(second);
    expect(await store.findRefreshToken("missing")).toBeNull();
  });

  it("enforces globally unique OAuth refresh hashes", async () => {
    const first = grant();
    const second = grant();
    const token = refresh(first);
    const duplicate = { ...refresh(second), tokenHash: token.tokenHash };
    await store.saveGrant(first);
    await store.saveGrant(second);
    await store.saveRefreshToken(token);
    await expect(store.saveRefreshToken(duplicate)).rejects.toMatchObject({ code: "23505" });
  });

  it("revokes only grants that overlap withdrawn scopes and preserves existing timestamps", async () => {
    const matches = grant(["user:read", "offline_access"]);
    const unrelated = grant(["openid"]);
    const token = refresh(matches);
    const at = new Date(Date.now() - 1000);
    await store.saveGrant(matches);
    await store.saveGrant(unrelated);
    await store.saveRefreshToken(token);
    await store.transaction((context) => context.revokeByClientScopes(client.getId(), [], at));
    expect((await store.findGrant(matches.id))?.revokedAt).toBeNull();
    await store.transaction((context) => context.revokeByClientScopes(client.getId(), ["user:read"], at));
    expect((await store.findGrant(matches.id))?.revokedAt).toEqual(at);
    expect((await store.findRefreshToken(token.tokenHash))?.revokedAt).toEqual(at);
    expect((await store.findGrant(unrelated.id))?.revokedAt).toBeNull();
    await store.revokeGrant(matches.id, new Date());
    expect((await store.findGrant(matches.id))?.revokedAt).toEqual(at);
  });

  it("lists grants with client names and stable pagination while isolating users", async () => {
    const first = grant();
    const second = grant();
    first.createdAt = new Date("2020-01-01");
    await store.saveGrant(first);
    await store.saveGrant(second);

    const page = await store.listByUserId(client.getUserId(), 1, 0);
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: second.id,
      clientId: client.getId(),
      clientName: client.getName().getValue(),
      scopes: second.scopes,
    });
    expect((await store.listByUserId(client.getUserId(), 1, 1)).items[0].id).toEqual(first.id);
    expect(await store.listByUserId(UserId.create(), 20, 0)).toEqual({ items: [], total: 0 });
  });

  it("cascades client deletion to codes, assignments, grants and refresh tokens", async () => {
    const item = grant();
    const token = refresh(item);
    const code = makeCode(client);
    await store.saveGrant(item);
    await store.saveRefreshToken(token);
    await codes.save(code);
    await db.clients.run(({ clientRepository }) => clientRepository.delete(client.getId()));
    expect(await store.findGrant(item.id)).toBeNull();
    expect(await store.findRefreshToken(token.tokenHash)).toBeNull();
    expect(await codes.findById(code.getId())).toBeNull();
  });
});
