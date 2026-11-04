import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListUserSessionsQueryHandler } from "@modules/session/application/handler/list-user-sessions.query.handler";
import { makeSession, sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import { ListUserSessionsQuery } from "@modules/session/application/query/list-user-sessions.query";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";

describe("ListUserSessionsQueryHandler", () => {
  it.each([0, 1])("returns a page with %s items and a filtered total", async (size) => {
    const repository = sessionRepository();
    const session = makeSession();
    const page = { items: size === 0 ? [] : [session], total: 12 };
    repository.findPageByUserId.mockResolvedValue(page);

    const handler = await testHandler(ListUserSessionsQueryHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);

    await expect(
      handler.execute(new ListUserSessionsQuery(session.getUserId().getValue(), 5, 10, "Chrome"))
    ).resolves.toBe(page);
    expect(repository.findPageByUserId).toHaveBeenCalledWith(
      session.getUserId(),
      { limit: 5, offset: 10 },
      { search: "Chrome", activeOnly: false }
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("propagates repository errors", async () => {
    const repository = sessionRepository();
    const session = makeSession();
    const error = new Error("lookup failed");
    repository.findPageByUserId.mockRejectedValue(error);

    const handler = await testHandler(ListUserSessionsQueryHandler, [
      { provide: SESSION_REPOSITORY, useValue: repository },
    ]);

    await expect(handler.execute(new ListUserSessionsQuery(session.getUserId().getValue()))).rejects.toBe(error);
  });
});
