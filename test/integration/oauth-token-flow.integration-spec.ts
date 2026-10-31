import { createHash } from "node:crypto";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { rsaKeys } from "@shared/testing/security-test.spec-support";
import { databaseFixture, redisFixture } from "@test/integration/support";

import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import { OAuthAuthorizationService } from "@modules/oauth/application/service/oauth-authorization.service";
import { OAuthPermissionsService } from "@modules/oauth/application/service/oauth-permissions.service";
import { OAuthTokenExchangeService } from "@modules/oauth/application/service/oauth-token-exchange.service";
import { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { Client } from "@modules/oauth/domain/entity/client";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { Scope } from "@modules/oauth/domain/entity/scope";
import { AuthorizationCodeAlreadyUsedException } from "@modules/oauth/domain/exception/authorization-code-already-used.exception";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { DbClient } from "@modules/oauth/infrastructure/entity/db-client.entity";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";
import { DbAuthorizationCodeRepository } from "@modules/oauth/infrastructure/repository/db-authorization-code.repository";
import { DbClientScopeRepository } from "@modules/oauth/infrastructure/repository/db-client-scope.repository";
import { DbClientRepository } from "@modules/oauth/infrastructure/repository/db-client.repository";
import { DbOAuthGrantStore } from "@modules/oauth/infrastructure/repository/db-oauth-grant.store";
import { DbScopeRepository } from "@modules/oauth/infrastructure/repository/db-scope.repository";
import { CryptoAuthorizationCodeService } from "@modules/oauth/infrastructure/security/crypto-authorization-code-service";
import { JwtIdTokenService } from "@modules/oauth/infrastructure/security/jwt-id-token.service";
import { JwtOAuthAccessTokenService } from "@modules/oauth/infrastructure/security/jwt-oauth-access-token.service";
import { RedisOAuthRevocationStore } from "@modules/oauth/infrastructure/security/redis-oauth-revocation.store";
import { OAuthGrantId } from "@modules/oauth/oauth.ids";
import { makeUser } from "@modules/user/application/handler/user-test.spec-support";
import { DbUserRole } from "@modules/user/infrastructure/entity/db-user-role.entity";
import { DbUser } from "@modules/user/infrastructure/entity/db-user.entity";
import { DbUserRepository } from "@modules/user/infrastructure/repository/db-user.repository";
import { BcryptPasswordHasher } from "@modules/user/infrastructure/security/bcrypt-password-hasher";

describe("OAuth token flow with real PostgreSQL, Redis and cryptography", () => {
  let db: Awaited<ReturnType<typeof databaseFixture>>;
  let redis: Awaited<ReturnType<typeof redisFixture>>;
  let exchange: OAuthTokenExchangeService;
  let authorization: OAuthAuthorizationService;
  let access: JwtOAuthAccessTokenService;
  let store: DbOAuthGrantStore;
  let codes: DbAuthorizationCodeRepository;
  let clients: DbClientRepository;
  let assignments: DbClientScopeRepository;
  let client: Client;
  let code: AuthorizationCode;
  let scope: Scope;
  let rawCode: string;
  let secretHash: string;
  const secret = "test-client-secret";
  const digest = (token: string) => createHash("sha256").update(token).digest("hex");
  const command = () =>
    new RedeemCodeCommand(client.getId().getValue(), secret, rawCode, "https://app.example.com/callback");

  beforeAll(async () => {
    db = await databaseFixture();
    redis = await redisFixture();
    secretHash = await new BcryptPasswordHasher().hash(secret);
  });

  beforeEach(async () => {
    await db.reset();

    const users = new DbUserRepository(db.source.getRepository(DbUser), db.source.getRepository(DbUserRole));
    clients = new DbClientRepository(db.source.getRepository(DbClient));
    assignments = new DbClientScopeRepository(db.source.getRepository(DbClientScope));

    const scopes = new DbScopeRepository(db.source.getRepository(DbScope));
    store = new DbOAuthGrantStore(db.source);
    codes = new DbAuthorizationCodeRepository(db.source.getRepository(DbAuthorizationCode));

    const codeService = new CryptoAuthorizationCodeService();
    const permissions = new OAuthPermissionsService(users, clients, assignments, scopes);
    const revocations = new RedisOAuthRevocationStore(redis.connection);
    const config = new ConfigService({
      ID_TOKEN_PRIVATE_KEY: rsaKeys().privateKey,
      APP_BASE_URL: "https://id.example.com",
      OAUTH_AUDIENCE: "test-api",
      OAUTH_ACCESS_TTL: 900,
      OAUTH_REFRESH_TTL: 86400,
      ID_TOKEN_TTL: 900,
    });
    access = new JwtOAuthAccessTokenService(new JwtService(), config);
    exchange = new OAuthTokenExchangeService(
      store,
      access,
      revocations,
      clients,
      permissions,
      codes,
      codeService,
      new JwtIdTokenService(new JwtService(), config),
      users,
      new BcryptPasswordHasher(),
      config
    );
    authorization = new OAuthAuthorizationService(access, store, revocations, permissions, config);

    const user = makeUser();
    await users.save(user);
    client = Client.create({ userId: user.getId(), name: new ClientName("Integration app"), secretHash });
    await clients.save(client);

    for (const name of ["user:read", "offline_access"]) {
      const item = Scope.create({ name: new ScopeName(name) });
      await scopes.save(item);
      await assignments.save(new ClientScope(client.getId(), item.getId(), new Date()));

      if (name === "user:read") scope = item;
    }

    rawCode = codeService.generate();
    code = AuthorizationCode.create({
      clientId: client.getId(),
      userId: user.getId(),
      codeHash: codeService.hash(rawCode),
      scopes: new CodeScopes(["user:read", "offline_access"]),
      redirectUri: new RedirectUri("https://app.example.com/callback"),
      expiresAt: new Date(Date.now() + 60000),
    });
    await codes.save(code);
  });

  afterAll(async () => {
    await redis?.close();
    await db?.close();
  });

  async function trackAccess(token: string) {
    const claims = await access.verify(token);
    redis.track(`oauth:revoked:${claims.grantId}`);

    return claims;
  }

  it("allows only one of two concurrent exchanges of the same authorization code", async () => {
    const results = await Promise.allSettled([exchange.redeem(command()), exchange.redeem(command())]);
    const success = results.filter((result) => result.status === "fulfilled");
    const failed = results.filter((result) => result.status === "rejected");
    expect(success).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(AuthorizationCodeAlreadyUsedException);
    await trackAccess(success[0].value.accessToken);
    expect((await codes.findById(code.getId()))?.getIsUsed()).toBe(true);
    expect((await store.listByUserId(client.getUserId(), 20, 0)).total).toBe(1);
    await expect(authorization.authorize(success[0].value.accessToken, ["user:read"])).resolves.toMatchObject({
      userId: client.getUserId().getValue(),
    });
  });

  it("detects a concurrent refresh replay and revokes the entire grant including the winning replacement", async () => {
    const issued = await exchange.redeem(command());
    const claims = await trackAccess(issued.accessToken);

    if (issued.refreshToken === undefined) throw new Error("Missing refresh token");

    const results = await Promise.allSettled([
      exchange.refresh(client.getId(), secret, issued.refreshToken),
      exchange.refresh(client.getId(), secret, issued.refreshToken),
    ]);
    const success = results.filter((result) => result.status === "fulfilled");
    const failed = results.filter((result) => result.status === "rejected");
    expect(success).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(UnauthorizedException);

    const replacement = success[0].value.refreshToken;

    if (replacement === undefined) throw new Error("Missing replacement");

    expect((await store.findGrant(OAuthGrantId.from(claims.grantId)))?.revokedAt).toBeInstanceOf(Date);
    expect((await store.findRefreshToken(digest(replacement)))?.revokedAt).toBeInstanceOf(Date);
    await expect(authorization.authorize(success[0].value.accessToken, ["user:read"])).rejects.toThrow(
      UnauthorizedException
    );
    await expect(exchange.refresh(client.getId(), secret, replacement)).rejects.toThrow(UnauthorizedException);
  });

  it("keeps refresh history and invalidates the old token on a normal rotation", async () => {
    const issued = await exchange.redeem(command());
    const claims = await trackAccess(issued.accessToken);

    if (issued.refreshToken === undefined) throw new Error("Missing refresh token");

    const rotated = await exchange.refresh(client.getId(), secret, issued.refreshToken);
    expect(rotated.refreshToken).not.toBe(issued.refreshToken);
    expect((await store.findRefreshToken(digest(issued.refreshToken)))?.usedAt).toBeInstanceOf(Date);

    const grant = await store.findGrant(OAuthGrantId.from(claims.grantId));
    expect(grant?.revokedAt).toBeNull();
    await expect(authorization.authorize(rotated.accessToken, ["user:read"])).resolves.toMatchObject({
      scopes: ["user:read", "offline_access"],
    });
  });

  it("rejects withdrawn scopes without consuming a refresh token", async () => {
    const issued = await exchange.redeem(command());
    await trackAccess(issued.accessToken);

    if (issued.refreshToken === undefined) throw new Error("Missing refresh token");

    await assignments.delete(client.getId(), scope.getId());
    await expect(exchange.refresh(client.getId(), secret, issued.refreshToken)).rejects.toThrow(ForbiddenException);
    expect((await store.findRefreshToken(digest(issued.refreshToken)))?.usedAt).toBeNull();
    await expect(authorization.authorize(issued.accessToken, ["user:read"])).rejects.toThrow(ForbiddenException);
  });
});
