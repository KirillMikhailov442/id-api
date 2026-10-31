import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import type { ITokenService } from "@shared/security/token-service";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import type { AccessTokenPayload, IssuedAccessToken } from "@modules/session/application/port/token-service";
import { SessionIssuer } from "@modules/session/application/session-issuer";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/session/session.tokens";
import { makeRole, makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

describe("SessionIssuer", () => {
  let repository: ReturnType<typeof sessionRepository>;
  let locked: ReturnType<typeof sessionRepository>;
  let user: ReturnType<typeof makeUser>;
  let roles: ReturnType<typeof userRepositories>["roleRepository"];
  let service: SessionIssuer;
  const issueRefresh = mockFn<IRefreshTokenService["issue"]>();
  const hash = mockFn<IRefreshTokenService["hash"]>();
  const issueAccess = mockFn<ITokenService<AccessTokenPayload, IssuedAccessToken>["issue"]>();
  const now = new Date("2026-01-01T00:00:00Z");
  const refreshExpiry = new Date("2026-01-02T00:00:00Z");
  const accessExpiry = new Date("2026-01-01T00:15:00Z");
  const device = { browser: "Chrome", os: "Windows", deviceType: "desktop" };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    issueRefresh.mockReset();
    hash.mockReset();
    issueAccess.mockReset();
    user = makeUser();
    roles = userRepositories().roleRepository;
    repository = sessionRepository();
    locked = sessionRepository();
    jest.spyOn(repository, "withUserLock").mockImplementation((_id, work) => work(locked));
    roles.findByIds.mockResolvedValue([]);
    issueRefresh.mockResolvedValue({ token: "raw-refresh", expiresAt: refreshExpiry, expiresIn: 86400 });
    hash.mockReturnValue(new RefreshHash("hashed-refresh"));
    issueAccess.mockResolvedValue({ token: "access-token", expiresAt: accessExpiry });
    service = await testHandler(SessionIssuer, [
      { provide: ROLE_REPOSITORY, useValue: roles },
      { provide: SESSION_REPOSITORY, useValue: repository },
      { provide: REFRESH_TOKEN_SERVICE, useValue: { issue: issueRefresh, hash } },
      { provide: TOKEN_SERVICE, useValue: { issue: issueAccess } },
    ]);
  });

  afterEach(() => jest.useRealTimers());

  it("issues tokens and persists the session and hashed refresh inside the user's lock", async () => {
    const assigned = makeRole("old-name");
    user.assignRole(assigned);
    assigned.rename(makeRole("current-name").getName());
    roles.findByIds.mockResolvedValue([assigned]);

    let insideLock = false;
    jest.spyOn(repository, "withUserLock").mockImplementation(async (_id, work) => {
      insideLock = true;

      try {
        return await work(locked);
      } finally {
        insideLock = false;
      }
    });
    issueAccess.mockImplementation(async () => {
      expect(insideLock).toBe(true);

      return { token: "access-token", expiresAt: accessExpiry };
    });
    locked.save.mockImplementation(async () => {
      expect(insideLock).toBe(true);
    });
    locked.createRefreshToken.mockImplementation(async () => {
      expect(insideLock).toBe(true);
    });
    await expect(service.create(user, device, "127.0.0.1")).resolves.toEqual({
      accessToken: "access-token",
      refreshToken: "raw-refresh",
    });
    expect(roles.findByIds).toHaveBeenCalledWith([assigned.getId()]);
    expect(repository.withUserLock).toHaveBeenCalledWith(user.getId(), expect.any(Function));
    expect(locked.save).toHaveBeenCalledTimes(1);

    const session = locked.save.mock.calls[0][0];
    expect(session.getUserId()).toEqual(user.getId());
    expect(session.getVersion()).toBe(1);
    expect(session.getBrowser()?.getValue()).toBe("Chrome");
    expect(session.getOs()?.getValue()).toBe("Windows");
    expect(session.getDeviceType()?.getValue()).toBe("desktop");
    expect(session.getIp().getValue()).toBe("127.0.0.1");
    expect(session.getExpiresAt()).toEqual(refreshExpiry);
    expect(session.getLastAccessExpiresAt()).toEqual(accessExpiry);
    expect(issueAccess).toHaveBeenCalledWith({
      userId: user.getId().getValue(),
      sessionId: session.getId().getValue(),
      sessionVersion: 1,
      roles: ["current-name"],
    });
    expect(hash).toHaveBeenCalledWith("raw-refresh");
    expect(locked.createRefreshToken).toHaveBeenCalledWith(session, new RefreshHash("hashed-refresh"));
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.createRefreshToken).not.toHaveBeenCalled();
  });

  it.each([null, "unsupported"])("normalizes unavailable device information %p to null", async (value) => {
    await service.create(user, { browser: value, os: value, deviceType: value }, "unknown");

    const session = locked.save.mock.calls[0][0];
    expect(session.getBrowser()).toBeNull();
    expect(session.getOs()).toBeNull();
    expect(session.getDeviceType()).toBeNull();
    expect(issueAccess.mock.calls[0][0].roles).toEqual([]);
  });

  it("rejects blocked users before issuing tokens or accessing repositories", async () => {
    user.block();
    await expect(service.create(user, device, "127.0.0.1")).rejects.toThrow(UserBlockedException);
    expect(issueRefresh).not.toHaveBeenCalled();
    expect(roles.findByIds).not.toHaveBeenCalled();
    expect(repository.withUserLock).not.toHaveBeenCalled();
    expect(issueAccess).not.toHaveBeenCalled();
  });

  it("rejects invalid IPs without persisting a session or issuing access tokens", async () => {
    await expect(service.create(user, device, "invalid-ip")).rejects.toThrow(InvalidValueObjectException);
    expect(locked.save).not.toHaveBeenCalled();
    expect(issueAccess).not.toHaveBeenCalled();
  });

  it.each(["refresh", "roles", "access", "save", "refresh persistence", "lock"])(
    "propagates a failure at %s without returning credentials",
    async (stage) => {
      const error = new Error("Dependency failed");

      if (stage === "refresh") issueRefresh.mockRejectedValue(error);

      if (stage === "roles") roles.findByIds.mockRejectedValue(error);

      if (stage === "access") issueAccess.mockRejectedValue(error);

      if (stage === "save") locked.save.mockRejectedValue(error);

      if (stage === "refresh persistence") locked.createRefreshToken.mockRejectedValue(error);

      if (stage === "lock") jest.spyOn(repository, "withUserLock").mockRejectedValue(error);

      await expect(service.create(user, device, "127.0.0.1")).rejects.toBe(error);

      if (["refresh", "roles", "lock"].includes(stage)) expect(issueAccess).not.toHaveBeenCalled();

      if (["refresh", "roles", "lock", "access"].includes(stage)) expect(locked.save).not.toHaveBeenCalled();

      if (stage !== "refresh persistence") expect(locked.createRefreshToken).not.toHaveBeenCalled();
    }
  );
});
