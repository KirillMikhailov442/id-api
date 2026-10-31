import { createHash } from "node:crypto";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import type { IIdTokenService } from "@modules/oauth/application/port/id-token-service.type";
import {
  OAUTH_ACCESS_TOKEN_SERVICE,
  type IOAuthAccessTokenService,
} from "@modules/oauth/application/port/oauth-access-token-service";
import { OAUTH_GRANT_STORE } from "@modules/oauth/application/port/oauth-grant-store";
import {
  OAUTH_REVOCATION_STORE,
  type IOAuthRevocationStore,
} from "@modules/oauth/application/port/oauth-revocation-store";
import { OAuthPermissionsService } from "@modules/oauth/application/service/oauth-permissions.service";
import {
  accessExpiresAt,
  grantExpiresAt,
  now,
  serviceFixture,
} from "@modules/oauth/application/service/oauth-service-test.spec-support";
import { OAuthTokenExchangeService } from "@modules/oauth/application/service/oauth-token-exchange.service";
import { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { AuthorizationCodeAlreadyUsedException } from "@modules/oauth/domain/exception/authorization-code-already-used.exception";
import { AuthorizationCodeExpiredException } from "@modules/oauth/domain/exception/authorization-code-expired.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";
import { InvalidAuthorizationCodeException } from "@modules/oauth/domain/exception/invalid-authorization-code.exception";
import { InvalidClientCredentialsException } from "@modules/oauth/domain/exception/invalid-client-credentials.exception";
import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { ClientId } from "@modules/oauth/oauth.ids";
import {
  AUTHORIZATION_CODE_REPOSITORY,
  AUTHORIZATION_CODE_SERVICE,
  CLIENT_REPOSITORY,
  ID_TOKEN_SERVICE,
} from "@modules/oauth/oauth.tokens";
import { userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
import { PASSWORD_HASHER, USER_REPOSITORY } from "@modules/user/user.tokens";

describe("OAuthTokenExchangeService", () => {
  let fixture: ReturnType<typeof serviceFixture>;
  let service: OAuthTokenExchangeService;
  let users: ReturnType<typeof userRepositories>["userRepository"];
  let code: AuthorizationCode;
  const issue = mockFn<IOAuthAccessTokenService["issue"]>();
  const revoke = mockFn<IOAuthRevocationStore["revoke"]>();
  const permissions = mockFn<OAuthPermissionsService["assertCurrentPermissions"]>();
  const findCode = mockFn<IAuthorizationCodeRepository["findByCodeHash"]>();
  const hashCode = mockFn<IAuthorizationCodeService["hash"]>();
  const issueIdToken = mockFn<IIdTokenService["issueIdToken"]>();
  const compare = mockFn<IPasswordHasher["compare"]>();
  const rawRefresh = "original-refresh-token";
  const digest = (token: string) => createHash("sha256").update(token).digest("hex");
  const command = (redirectUri?: string) =>
    new RedeemCodeCommand(fixture.client.getId().getValue(), "client-secret", "raw-code", redirectUri);

  function setCode(
    scopes = ["user:read", "offline_access"],
    clientId = fixture.client.getId(),
    expiresAt = new Date(now.getTime() + 60000)
  ) {
    code = AuthorizationCode.create({
      clientId,
      userId: fixture.user.getId(),
      codeHash: new CodeHash("a".repeat(64)),
      scopes: new CodeScopes(scopes),
      redirectUri: new RedirectUri("https://app.example.com/callback"),
      expiresAt,
    });
    findCode.mockResolvedValue(code);
    fixture.context.lockAuthorizationCode.mockResolvedValue(code);
  }

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    issue.mockReset();
    revoke.mockReset();
    permissions.mockReset();
    findCode.mockReset();
    hashCode.mockReset();
    issueIdToken.mockReset();
    compare.mockReset();
    fixture = serviceFixture();
    users = userRepositories().userRepository;
    users.findById.mockResolvedValue(fixture.user);
    fixture.clientRepository.findById.mockResolvedValue(fixture.client);
    compare.mockResolvedValue(true);
    hashCode.mockReturnValue(new CodeHash("a".repeat(64)));
    issue.mockResolvedValue({ token: "access-token", expiresAt: accessExpiresAt, expiresIn: 900 });
    issueIdToken.mockResolvedValue("id-token");
    setCode();
    fixture.refresh.tokenHash = digest(rawRefresh);
    fixture.store.findRefreshToken.mockResolvedValue({ ...fixture.refresh });
    fixture.context.findRefreshToken.mockResolvedValue(fixture.refresh);
    fixture.context.findGrant.mockResolvedValue(fixture.grant);
    service = await testHandler(OAuthTokenExchangeService, [
      { provide: OAUTH_GRANT_STORE, useValue: fixture.store },
      { provide: OAUTH_ACCESS_TOKEN_SERVICE, useValue: { issue } },
      { provide: OAUTH_REVOCATION_STORE, useValue: { revoke } },
      { provide: CLIENT_REPOSITORY, useValue: fixture.clientRepository },
      { provide: OAuthPermissionsService, useValue: { assertCurrentPermissions: permissions } },
      { provide: AUTHORIZATION_CODE_REPOSITORY, useValue: { findByCodeHash: findCode } },
      { provide: AUTHORIZATION_CODE_SERVICE, useValue: { hash: hashCode } },
      { provide: ID_TOKEN_SERVICE, useValue: { issueIdToken } },
      { provide: USER_REPOSITORY, useValue: users },
      { provide: PASSWORD_HASHER, useValue: { compare } },
      { provide: ConfigService, useValue: new ConfigService({ OAUTH_AUDIENCE: "test-api", OAUTH_REFRESH_TTL: 86400 }) },
    ]);
  });

  afterEach(() => jest.useRealTimers());
  describe.each(["redeem", "refresh"] as const)("%s client authentication", (operation) => {
    const invoke = () =>
      operation === "redeem"
        ? service.redeem(command())
        : service.refresh(fixture.client.getId(), "client-secret", rawRefresh);

    it.each(["missing", "wrong secret", "inactive"])(
      "rejects a client with %s credentials before token lookup",
      async (state) => {
        if (state === "missing") fixture.clientRepository.findById.mockResolvedValue(null);

        if (state === "wrong secret") compare.mockResolvedValue(false);

        if (state === "inactive") fixture.client.deactivate();

        await expect(invoke()).rejects.toThrow(
          state === "inactive" ? ClientInactiveException : InvalidClientCredentialsException
        );
        expect(findCode).not.toHaveBeenCalled();
        expect(fixture.store.findRefreshToken).not.toHaveBeenCalled();
        expect(issue).not.toHaveBeenCalled();

        if (state === "missing") expect(compare).not.toHaveBeenCalled();
        else expect(compare).toHaveBeenCalledWith("client-secret", fixture.client.getSecretHash());
      }
    );

    it("propagates password verification failures", async () => {
      const error = new Error("Hash service failed");
      compare.mockRejectedValue(error);
      await expect(invoke()).rejects.toBe(error);
      expect(issue).not.toHaveBeenCalled();
    });
  });
  describe("redeem", () => {
    it("exchanges a code for access and offline refresh tokens and consumes it after persistence", async () => {
      const transaction = jest.spyOn(fixture.store, "transaction");
      const result = await service.redeem(command("https://APP.example.com:443/callback"));
      expect(result).toEqual({
        clientId: fixture.client.getId().getValue(),
        userId: fixture.user.getId().getValue(),
        scopes: ["user:read", "offline_access"],
        accessToken: "access-token",
        refreshToken: expect.any(String) as unknown,
        expiresIn: 900,
      });
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(hashCode).toHaveBeenCalledWith("raw-code");
      expect(findCode).toHaveBeenCalledWith("a".repeat(64));
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(fixture.context.lockClient).toHaveBeenCalledWith(fixture.client.getId());
      expect(fixture.context.lockAuthorizationCode).toHaveBeenCalledWith(code.getId());

      const grant = fixture.context.saveGrant.mock.calls[0][0];
      expect(grant).toMatchObject({
        userId: fixture.user.getId(),
        clientId: fixture.client.getId(),
        scopes: code.getScopes().getItems(),
        audience: "test-api",
        createdAt: now,
        expiresAt: grantExpiresAt,
        lastAccessExpiresAt: accessExpiresAt,
        revokedAt: null,
      });
      expect(permissions).toHaveBeenCalledWith(grant);
      expect(issue).toHaveBeenCalledWith({
        userId: grant.userId.getValue(),
        clientId: grant.clientId.getValue(),
        grantId: grant.id.getValue(),
        scopes: grant.scopes,
      });

      const refresh = fixture.context.saveRefreshToken.mock.calls[0][0];
      expect(refresh).toMatchObject({
        grantId: grant.id,
        tokenHash: digest(result.refreshToken ?? ""),
        createdAt: now,
        expiresAt: grantExpiresAt,
        usedAt: null,
        revokedAt: null,
      });
      expect(refresh.tokenHash).not.toBe(result.refreshToken);
      expect(fixture.context.consumeAuthorizationCode).toHaveBeenCalledWith(code.getId());
      expect(fixture.context.consumeAuthorizationCode.mock.invocationCallOrder[0]).toBeGreaterThan(
        fixture.context.saveRefreshToken.mock.invocationCallOrder[0]
      );
      expect(users.findById).not.toHaveBeenCalled();
      expect(issueIdToken).not.toHaveBeenCalled();
    });

    it("omits refresh tokens without offline_access and limits the grant to access expiry", async () => {
      setCode(["user:read"]);

      const result = await service.redeem(command());
      expect(result.refreshToken).toBeUndefined();
      expect(fixture.context.saveRefreshToken).not.toHaveBeenCalled();
      expect(fixture.context.saveGrant.mock.calls[0][0].expiresAt).toEqual(accessExpiresAt);
    });

    it("issues an ID token with the current profile for openid scope", async () => {
      setCode(["openid", "user:read"]);

      const result = await service.redeem(command());
      expect(result.idToken).toBe("id-token");
      expect(users.findById).toHaveBeenCalledWith(fixture.user.getId());
      expect(issueIdToken).toHaveBeenCalledWith({
        userId: fixture.user.getId().getValue(),
        clientId: fixture.client.getId().getValue(),
        scopes: ["openid", "user:read"],
        profile: { name: "Ivan", surname: "Ivanov", avatar: fixture.user.getAvatar() },
      });
      expect(fixture.context.consumeAuthorizationCode.mock.invocationCallOrder[0]).toBeGreaterThan(
        issueIdToken.mock.invocationCallOrder[0]
      );
    });

    it.each([
      "missing candidate",
      "candidate for another client",
      "missing locked code",
      "locked code for another client",
      "used code",
      "expired code",
      "expiry boundary",
      "wrong redirect",
    ])("rejects %s without issuing or persisting tokens", async (state) => {
      const transaction = jest.spyOn(fixture.store, "transaction");

      if (state === "missing candidate") findCode.mockResolvedValue(null);

      if (state === "candidate for another client") setCode(["user:read"], ClientId.create());

      if (state === "missing locked code") fixture.context.lockAuthorizationCode.mockResolvedValue(null);

      if (state === "locked code for another client") {
        const candidate = code;
        setCode(["user:read"], ClientId.create());
        findCode.mockResolvedValue(candidate);
      }

      if (state === "used code") code.markUsed();

      if (state === "expired code") setCode(["user:read"], fixture.client.getId(), new Date(now.getTime() - 1));

      if (state === "expiry boundary") setCode(["user:read"], fixture.client.getId(), now);

      const expected =
        state === "used code"
          ? AuthorizationCodeAlreadyUsedException
          : state.includes("expir")
            ? AuthorizationCodeExpiredException
            : InvalidAuthorizationCodeException;
      await expect(
        service.redeem(command(state === "wrong redirect" ? "https://attacker.example.com/callback" : undefined))
      ).rejects.toThrow(expected);
      expect(issue).not.toHaveBeenCalled();
      expect(fixture.context.saveGrant).not.toHaveBeenCalled();
      expect(fixture.context.saveRefreshToken).not.toHaveBeenCalled();
      expect(fixture.context.consumeAuthorizationCode).not.toHaveBeenCalled();

      if (state.startsWith("candidate") || state === "missing candidate") expect(transaction).not.toHaveBeenCalled();
    });

    it("rejects withdrawn permissions before token issuance", async () => {
      permissions.mockRejectedValue(new ForbiddenException());
      await expect(service.redeem(command())).rejects.toThrow(ForbiddenException);
      expect(issue).not.toHaveBeenCalled();
      expect(fixture.context.saveGrant).not.toHaveBeenCalled();
      expect(fixture.context.consumeAuthorizationCode).not.toHaveBeenCalled();
    });

    it("does not consume an openid code when the user no longer exists", async () => {
      setCode(["openid"]);
      users.findById.mockResolvedValue(null);
      await expect(service.redeem(command())).rejects.toThrow(UnauthorizedException);
      expect(issueIdToken).not.toHaveBeenCalled();
      expect(fixture.context.consumeAuthorizationCode).not.toHaveBeenCalled();
    });

    it.each(["access token", "grant persistence", "refresh persistence", "ID token", "code consumption"])(
      "propagates %s failures",
      async (stage) => {
        const error = new Error("Issue failed");

        if (stage === "access token") issue.mockRejectedValue(error);

        if (stage === "grant persistence") fixture.context.saveGrant.mockRejectedValue(error);

        if (stage === "refresh persistence") fixture.context.saveRefreshToken.mockRejectedValue(error);

        if (stage === "ID token") {
          setCode(["openid"]);
          issueIdToken.mockRejectedValue(error);
        }

        if (stage === "code consumption") fixture.context.consumeAuthorizationCode.mockRejectedValue(error);

        await expect(service.redeem(command())).rejects.toBe(error);

        if (stage !== "code consumption") expect(fixture.context.consumeAuthorizationCode).not.toHaveBeenCalled();
      }
    );
  });
  describe("refresh", () => {
    const invoke = () => service.refresh(fixture.client.getId(), "client-secret", rawRefresh);

    it("locks and re-reads the token, marks it used and persists a new hashed refresh", async () => {
      const result = await invoke();
      expect(fixture.store.findRefreshToken).toHaveBeenCalledWith(digest(rawRefresh));
      expect(fixture.context.lockClient).toHaveBeenCalledWith(fixture.client.getId());
      expect(fixture.context.findGrant).toHaveBeenCalledWith(fixture.grant.id, true);
      expect(fixture.context.findRefreshToken).toHaveBeenCalledWith(digest(rawRefresh));
      expect(permissions).toHaveBeenCalledWith(fixture.grant);
      expect(fixture.context.saveRefreshToken).toHaveBeenCalledTimes(2);
      expect(fixture.context.saveRefreshToken.mock.calls[0][0]).toMatchObject({ id: fixture.refresh.id, usedAt: now });

      const replacement = fixture.context.saveRefreshToken.mock.calls[1][0];
      expect(replacement.tokenHash).toBe(digest(result.refreshToken ?? ""));
      expect(replacement.id.equals(fixture.refresh.id)).toBe(false);
      expect(replacement).toMatchObject({
        grantId: fixture.grant.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: grantExpiresAt,
      });
      expect(result.refreshToken).not.toBe(rawRefresh);
      expect(result.accessToken).toBe("access-token");
      expect(result.idToken).toBeUndefined();
      expect(fixture.context.saveRefreshToken.mock.invocationCallOrder[0]).toBeLessThan(
        issue.mock.invocationCallOrder[0]
      );
      expect(revoke).not.toHaveBeenCalled();
      expect(fixture.context.consumeAuthorizationCode).not.toHaveBeenCalled();
    });

    it("rejects unknown refresh tokens before opening a transaction", async () => {
      const transaction = jest.spyOn(fixture.store, "transaction");
      fixture.store.findRefreshToken.mockResolvedValue(null);
      await expect(invoke()).rejects.toThrow(UnauthorizedException);
      expect(transaction).not.toHaveBeenCalled();
      expect(issue).not.toHaveBeenCalled();
    });

    it.each([
      "missing grant",
      "wrong client",
      "revoked grant",
      "expired grant",
      "grant expiry boundary",
      "missing locked token",
      "revoked token",
      "expired token",
      "token expiry boundary",
    ])("rejects %s without issuing tokens or revoking an unrelated grant", async (state) => {
      if (state === "missing grant") fixture.context.findGrant.mockResolvedValue(null);

      if (state === "wrong client") fixture.grant.clientId = ClientId.create();

      if (state === "revoked grant") fixture.grant.revokedAt = now;

      if (state === "expired grant") fixture.grant.expiresAt = new Date(now.getTime() - 1);

      if (state === "grant expiry boundary") fixture.grant.expiresAt = now;

      if (state === "missing locked token") fixture.context.findRefreshToken.mockResolvedValue(null);

      if (state === "revoked token") fixture.refresh.revokedAt = now;

      if (state === "expired token") fixture.refresh.expiresAt = new Date(now.getTime() - 1);

      if (state === "token expiry boundary") fixture.refresh.expiresAt = now;

      await expect(invoke()).rejects.toThrow(UnauthorizedException);
      expect(issue).not.toHaveBeenCalled();
      expect(permissions).not.toHaveBeenCalled();
      expect(fixture.context.saveGrant).not.toHaveBeenCalled();
      expect(fixture.context.saveRefreshToken).not.toHaveBeenCalled();
      expect(fixture.context.revokeGrant).not.toHaveBeenCalled();
      expect(revoke).not.toHaveBeenCalled();
    });

    it("detects reuse from the locked token and revokes the grant after committing", async () => {
      fixture.refresh.usedAt = new Date(now.getTime() - 1);

      const original = fixture.store.transaction.bind(fixture.store);
      let committed = false;
      jest.spyOn(fixture.store, "transaction").mockImplementation(async (work) => {
        const outcome = await original(work);
        expect(revoke).not.toHaveBeenCalled();
        committed = true;

        return outcome;
      });
      revoke.mockImplementation(async () => {
        expect(committed).toBe(true);
      });
      await expect(invoke()).rejects.toThrow(UnauthorizedException);
      expect(fixture.context.revokeGrant).toHaveBeenCalledWith(fixture.grant.id, now);
      expect(revoke).toHaveBeenCalledWith(fixture.grant.id, fixture.grant.lastAccessExpiresAt);
      expect(issue).not.toHaveBeenCalled();
      expect(fixture.context.saveRefreshToken).not.toHaveBeenCalled();
    });

    it("does not publish revocation when committing reuse detection fails", async () => {
      fixture.refresh.usedAt = now;

      const error = new Error("Commit failed");
      jest.spyOn(fixture.store, "transaction").mockImplementation(async (work) => {
        await work(fixture.context);
        throw error;
      });
      await expect(invoke()).rejects.toBe(error);
      expect(revoke).not.toHaveBeenCalled();
    });

    it("keeps the latest access expiry when a replacement token expires sooner", async () => {
      const latest = new Date(accessExpiresAt.getTime() + 60000);
      fixture.grant.lastAccessExpiresAt = latest;
      await invoke();
      expect(fixture.context.saveGrant.mock.calls[0][0].lastAccessExpiresAt).toEqual(latest);
    });

    it("advances the access expiry when a replacement token expires later", async () => {
      fixture.grant.lastAccessExpiresAt = now;
      await invoke();
      expect(fixture.context.saveGrant.mock.calls[0][0].lastAccessExpiresAt).toEqual(accessExpiresAt);
      expect(fixture.context.saveGrant.mock.calls[0][0].expiresAt).toEqual(grantExpiresAt);
    });

    it("rejects withdrawn permissions without consuming the refresh token", async () => {
      permissions.mockRejectedValue(new ForbiddenException());
      await expect(invoke()).rejects.toThrow(ForbiddenException);
      expect(fixture.refresh.usedAt).toBeNull();
      expect(fixture.context.saveRefreshToken).not.toHaveBeenCalled();
      expect(issue).not.toHaveBeenCalled();
    });

    it.each(["lookup", "lock", "access", "save used token", "save grant", "save replacement", "revocation store"])(
      "propagates %s failures",
      async (stage) => {
        const error = new Error("Refresh failed");

        if (stage === "lookup") fixture.store.findRefreshToken.mockRejectedValue(error);

        if (stage === "lock") fixture.context.lockClient.mockRejectedValue(error);

        if (stage === "access") issue.mockRejectedValue(error);

        if (stage === "save used token") fixture.context.saveRefreshToken.mockRejectedValueOnce(error);

        if (stage === "save grant") fixture.context.saveGrant.mockRejectedValue(error);

        if (stage === "save replacement")
          fixture.context.saveRefreshToken.mockResolvedValueOnce(undefined).mockRejectedValueOnce(error);

        if (stage === "revocation store") {
          fixture.refresh.usedAt = now;
          revoke.mockRejectedValue(error);
        }

        await expect(invoke()).rejects.toBe(error);
      }
    );
  });
});
