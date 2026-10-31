import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { LogoutCommand } from "@modules/session/application/command/logout.command";
import { LogoutCommandHandler } from "@modules/session/application/handler/logout.command.handler";
import { makeSession, sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY } from "@modules/session/session.tokens";

describe("LogoutCommandHandler", () => {
  let repository: ReturnType<typeof sessionRepository>;
  let session: ReturnType<typeof makeSession>;
  let handler: LogoutCommandHandler;
  const hash = mockFn<IRefreshTokenService["hash"]>();
  const command = new LogoutCommand("raw-refresh-token");

  beforeEach(async () => {
    repository = sessionRepository();
    session = makeSession();
    hash.mockReset();
    hash.mockReturnValue(new RefreshHash("token-hash"));
    repository.findByRefreshHash.mockResolvedValue(session);
    repository.findRefreshToken.mockResolvedValue({
      sessionId: session.getId(),
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date("2100-01-01"),
    });
    handler = await testHandler(LogoutCommandHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
      { provide: REFRESH_TOKEN_SERVICE, useValue: { hash } },
    ]);
  });

  it("revokes only the token session under the user lock", async () => {
    const lock = jest.spyOn(repository, "withUserLock");
    await handler.execute(command);
    expect(hash).toHaveBeenCalledWith("raw-refresh-token");
    expect(lock).toHaveBeenCalledWith(session.getUserId(), expect.any(Function));
    expect(repository.revokeById).toHaveBeenCalledWith(session.getId(), expect.any(Date));
    expect(repository.revokeAllByUserId).not.toHaveBeenCalled();
    expect(repository.findByRefreshHash).toHaveBeenCalledTimes(2);
  });

  it("rejects an unknown token before acquiring a lock", async () => {
    repository.findByRefreshHash.mockResolvedValue(null);

    const lock = jest.spyOn(repository, "withUserLock");
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(lock).not.toHaveBeenCalled();
    expect(repository.revokeById).not.toHaveBeenCalled();
  });

  it("rechecks the session after acquiring the lock", async () => {
    repository.findByRefreshHash.mockResolvedValueOnce(session).mockResolvedValueOnce(null);
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.revokeById).not.toHaveBeenCalled();
  });

  it("rejects an inactive session", async () => {
    session.revoke();
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.revokeById).not.toHaveBeenCalled();
  });

  it.each(["missing", "used", "revoked", "expired"])("rejects a %s refresh token without revoking", async (state) => {
    repository.findRefreshToken.mockResolvedValue(
      state === "missing"
        ? null
        : {
            sessionId: session.getId(),
            usedAt: state === "used" ? new Date() : null,
            revokedAt: state === "revoked" ? new Date() : null,
            expiresAt: new Date(state === "expired" ? "2000-01-01" : "2100-01-01"),
          }
    );
    await expect(handler.execute(command)).rejects.toThrow(InvalidRefreshTokenException);
    expect(repository.revokeById).not.toHaveBeenCalled();
  });

  it("propagates a revocation failure", async () => {
    const error = new Error("revoke failed");
    repository.revokeById.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
  });
});
