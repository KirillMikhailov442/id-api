import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { RefreshCommand } from "@modules/session/application/command/refresh.command";
import { RefreshCommandHandler } from "@modules/session/application/handler/refresh.command.handler";
import { makeSession, sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/session/session.tokens";
import { RoleId } from "@modules/user/user.ids";
import { ROLE_REPOSITORY, USER_REPOSITORY, UserBlockedStatus } from "@modules/user/user.module";

describe("RefreshCommandHandler", () => {
  let repository: ReturnType<typeof sessionRepository>;
  let session: ReturnType<typeof makeSession>;
  let handler: RefreshCommandHandler;
  const hash = mockFn<IRefreshTokenService["hash"]>();
  const issueRefresh = mockFn<IRefreshTokenService["issue"]>();
  const issueAccess = jest.fn();
  const findUser = jest.fn();
  const findRoles = jest.fn();
  const blocked = jest.fn();
  const roleId = RoleId.create();
  const command = new RefreshCommand(
    "old-token",
    { browser: "Chrome", os: "Windows", deviceType: "desktop" },
    "127.0.0.2"
  );

  beforeEach(async () => {
    repository = sessionRepository();
    session = makeSession();
    hash.mockReset();
    issueRefresh.mockReset();
    issueAccess.mockReset();
    findUser.mockReset();
    findRoles.mockReset();
    blocked.mockReset();
    blocked.mockReturnValue(UserBlockedStatus.Active);
    findUser.mockResolvedValue({
      getId: () => session.getUserId(),
      getIsBlocked: blocked,
      getRoles: () => [{ getRoleId: () => roleId }],
    });
    findRoles.mockResolvedValue([{ getName: () => ({ getValue: () => "user" }) }]);
    hash.mockImplementation((raw) => new RefreshHash(raw + "-hash"));
    issueRefresh.mockResolvedValue({ token: "new-refresh", expiresAt: new Date("2100-02-01"), expiresIn: 3600 });
    issueAccess.mockResolvedValue({ token: "new-access", expiresAt: new Date("2100-01-02") });
    repository.findByRefreshHash.mockResolvedValue(session);
    repository.rotate.mockResolvedValue(true);
    repository.findRefreshToken.mockResolvedValue({
      sessionId: session.getId(),
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date("2100-01-01"),
    });
    handler = await testHandler(RefreshCommandHandler, [
      { provide: USER_REPOSITORY, useValue: { findById: findUser } },
      { provide: ROLE_REPOSITORY, useValue: { findByIds: findRoles } },
      { provide: SESSION_REPOSITORY, useValue: repository },
      { provide: REFRESH_TOKEN_SERVICE, useValue: { hash, issue: issueRefresh } },
      { provide: TOKEN_SERVICE, useValue: { issue: issueAccess } },
    ]);
  });

  it("rotates refresh tokens, increments the session version and issues role claims under a lock", async () => {
    const previousAccessExpiresAt = session.getLastAccessExpiresAt();
    const lock = jest.spyOn(repository, "withUserLock");
    await expect(handler.execute(command)).resolves.toEqual({ accessToken: "new-access", refreshToken: "new-refresh" });
    expect(lock).toHaveBeenCalledWith(session.getUserId(), expect.any(Function));
    expect(findUser).toHaveBeenCalledWith(session.getUserId());
    expect(findRoles).toHaveBeenCalledWith([roleId]);
    expect(issueAccess).toHaveBeenCalledWith({
      userId: session.getUserId().getValue(),
      sessionId: session.getId().getValue(),
      sessionVersion: 2,
      roles: ["user"],
    });
    expect(repository.rotate).toHaveBeenCalledWith(
      session,
      new RefreshHash("old-token-hash"),
      new RefreshHash("new-refresh-hash"),
      previousAccessExpiresAt
    );
    expect(session.getBrowser()?.getValue()).toBe("Chrome");
    expect(session.getIp().getValue()).toBe("127.0.0.2");
    expect(session.getLastAccessExpiresAt()).toEqual(new Date("2100-01-02"));
  });

  it("rejects an unknown token without acquiring a lock", async () => {
    repository.findByRefreshHash.mockResolvedValue(null);

    const lock = jest.spyOn(repository, "withUserLock");
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(lock).not.toHaveBeenCalled();
    expect(issueRefresh).not.toHaveBeenCalled();
  });

  it("rechecks that the session exists inside the lock", async () => {
    repository.findByRefreshHash.mockResolvedValueOnce(session).mockResolvedValueOnce(null);
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(issueRefresh).not.toHaveBeenCalled();
  });

  it("rejects inactive sessions", async () => {
    session.revoke();
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(issueRefresh).not.toHaveBeenCalled();
  });

  it.each(["missing", "revoked", "expired"])("rejects a %s token without issuing new tokens", async (state) => {
    repository.findRefreshToken.mockResolvedValue(
      state === "missing"
        ? null
        : {
            sessionId: session.getId(),
            usedAt: null,
            revokedAt: state === "revoked" ? new Date() : null,
            expiresAt: new Date(state === "expired" ? "2000-01-01" : "2100-01-01"),
          }
    );
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(issueRefresh).not.toHaveBeenCalled();
    expect(issueAccess).not.toHaveBeenCalled();
    expect(repository.rotate).not.toHaveBeenCalled();
    expect(repository.revokeById).not.toHaveBeenCalled();
  });

  it("revokes the session when a used refresh token is replayed", async () => {
    repository.findRefreshToken.mockResolvedValue({
      sessionId: session.getId(),
      usedAt: new Date(),
      revokedAt: null,
      expiresAt: new Date("2100-01-01"),
    });
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.revokeById).toHaveBeenCalledWith(session.getId(), expect.any(Date));
    expect(issueRefresh).not.toHaveBeenCalled();
    expect(repository.rotate).not.toHaveBeenCalled();
  });

  it("rejects a session whose owner no longer exists", async () => {
    findUser.mockResolvedValue(null);
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(issueRefresh).not.toHaveBeenCalled();
  });

  it("rejects a blocked owner without issuing tokens", async () => {
    blocked.mockReturnValue(UserBlockedStatus.Inactive);
    await expect(handler.execute(command)).rejects.toThrow(UserBlockedException);
    expect(issueRefresh).not.toHaveBeenCalled();
    expect(issueAccess).not.toHaveBeenCalled();
  });

  it("rejects a lost concurrent rotation instead of returning tokens", async () => {
    repository.rotate.mockResolvedValue(false);
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.rotate).toHaveBeenCalledTimes(1);
  });

  it("does not persist a rotation if access token issuance fails", async () => {
    const error = new Error("issuer failed");
    issueAccess.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(repository.rotate).not.toHaveBeenCalled();
  });
});
