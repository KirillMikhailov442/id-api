import { testHandler } from "@shared/testing/handler-test.spec-support";

import { RevokeSessionCommand } from "@modules/session/application/command/revoke-session.command";
import { RevokeSessionCommandHandler } from "@modules/session/application/handler/revoke-session.command.handler";
import { makeSession, sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import { SessionNotFoundException } from "@modules/session/domain/exception/session-not-found.exception";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";

describe("RevokeSessionCommandHandler", () => {
  it.each([true, false])("handles ownership-checked revocation result %s", async (revoked) => {
    const repository = sessionRepository();
    const session = makeSession();
    repository.revokeByIdAndUserId.mockResolvedValue(revoked);

    const lock = jest.spyOn(repository, "withUserLock");
    const handler = await testHandler(RevokeSessionCommandHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);
    const result = handler.execute(
      new RevokeSessionCommand(session.getUserId().getValue(), session.getId().getValue())
    );

    if (revoked) {
      await expect(result).resolves.toBeUndefined();
    } else {
      await expect(result).rejects.toThrow(SessionNotFoundException);
    }

    expect(lock).toHaveBeenCalledWith(session.getUserId(), expect.any(Function));
    expect(repository.revokeByIdAndUserId).toHaveBeenCalledWith(session.getId(), session.getUserId(), expect.any(Date));
    expect(repository.revokeById).not.toHaveBeenCalled();
  });

  it("propagates a repository failure", async () => {
    const repository = sessionRepository();
    const session = makeSession();
    const error = new Error("revoke failed");
    repository.revokeByIdAndUserId.mockRejectedValue(error);

    const handler = await testHandler(RevokeSessionCommandHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);
    await expect(
      handler.execute(new RevokeSessionCommand(session.getUserId().getValue(), session.getId().getValue()))
    ).rejects.toBe(error);
  });
});
