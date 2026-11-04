import { testHandler } from "@shared/testing/handler-test.spec-support";

import { RevokeUserSessionsCommand } from "@modules/session/application/command/revoke-user-sessions.command";
import { RevokeUserSessionsCommandHandler } from "@modules/session/application/handler/revoke-user-sessions.command.handler";
import { makeSession, sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";

describe("RevokeUserSessionsCommandHandler", () => {
  it("revokes all sessions using the repository under the user lock", async () => {
    const repository = sessionRepository();
    const locked = sessionRepository();
    const userId = makeSession().getUserId();
    const lock = jest.spyOn(repository, "withUserLock").mockImplementation((_id, work) => work(locked));
    const handler = await testHandler(RevokeUserSessionsCommandHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);

    await expect(handler.execute(new RevokeUserSessionsCommand(userId.getValue()))).resolves.toBeUndefined();
    expect(lock).toHaveBeenCalledWith(userId, expect.any(Function));
    expect(locked.revokeAllByUserId).toHaveBeenCalledWith(userId, expect.any(Date));
    expect(repository.revokeAllByUserId).not.toHaveBeenCalled();
  });

  it("propagates revocation failures", async () => {
    const repository = sessionRepository();
    const error = new Error("revoke failed");
    repository.revokeAllByUserId.mockRejectedValue(error);

    const handler = await testHandler(RevokeUserSessionsCommandHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);

    await expect(handler.execute(new RevokeUserSessionsCommand(makeSession().getUserId().getValue()))).rejects.toBe(
      error
    );
  });
});
