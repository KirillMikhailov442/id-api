import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListActiveSessionsQueryHandler } from "@modules/session/application/handler/list-active-sessions.query.handler";
import { makeSession, sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import { ListActiveSessionsQuery } from "@modules/session/application/query/list-active-sessions.query";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";

describe("ListActiveSessionsQueryHandler", () => {
  it.each([0, 1])("returns %s active sessions for the requested owner", async (size) => {
    const repository = sessionRepository();
    const session = makeSession();
    const items = size === 0 ? [] : [session];
    repository.findActiveByUserId.mockResolvedValue(items);

    const handler = await testHandler(ListActiveSessionsQueryHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);
    await expect(handler.execute(new ListActiveSessionsQuery(session.getUserId().getValue()))).resolves.toBe(items);
    expect(repository.findActiveByUserId).toHaveBeenCalledWith(session.getUserId());
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("propagates lookup errors", async () => {
    const repository = sessionRepository();
    const session = makeSession();
    const error = new Error("lookup failed");
    repository.findActiveByUserId.mockRejectedValue(error);

    const handler = await testHandler(ListActiveSessionsQueryHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);
    await expect(handler.execute(new ListActiveSessionsQuery(session.getUserId().getValue()))).rejects.toBe(error);
  });
});
