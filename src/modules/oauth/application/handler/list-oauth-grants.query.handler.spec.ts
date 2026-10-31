import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { ListOAuthGrantsQueryHandler } from "@modules/oauth/application/handler/list-oauth-grants.query.handler";
import { requester } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { OAUTH_GRANT_STORE, type IOAuthGrantStore } from "@modules/oauth/application/port/oauth-grant-store";
import { ListOAuthGrantsQuery } from "@modules/oauth/application/query/list-oauth-grants.query";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY, UserNotFoundException } from "@modules/user/user.module";

describe("ListOAuthGrantsQueryHandler", () => {
  const findById = jest.fn();
  const listByUserId = mockFn<IOAuthGrantStore["listByUserId"]>();
  let handler: ListOAuthGrantsQueryHandler;

  beforeEach(async () => {
    findById.mockReset();
    listByUserId.mockReset();
    findById.mockResolvedValue({ id: requester.userId });
    handler = await testHandler(ListOAuthGrantsQueryHandler, [
      { provide: USER_REPOSITORY, useValue: { findById } },
      { provide: OAUTH_GRANT_STORE, useValue: { listByUserId } },
    ]);
  });

  it("checks the user and forwards pagination", async () => {
    const page = { items: [], total: 0 };
    listByUserId.mockResolvedValue(page);
    await expect(handler.execute(new ListOAuthGrantsQuery(requester.userId, 5, 10))).resolves.toBe(page);
    expect(findById).toHaveBeenCalledWith(UserId.from(requester.userId));
    expect(listByUserId).toHaveBeenCalledWith(UserId.from(requester.userId), 5, 10);
  });

  it("does not list grants for a missing user", async () => {
    findById.mockResolvedValue(null);
    await expect(handler.execute(new ListOAuthGrantsQuery(requester.userId, 5, 0))).rejects.toThrow(
      UserNotFoundException
    );
    expect(listByUserId).not.toHaveBeenCalled();
  });

  it("propagates store errors", async () => {
    const error = new Error("store failed");
    listByUserId.mockRejectedValue(error);
    await expect(handler.execute(new ListOAuthGrantsQuery(requester.userId, 5, 0))).rejects.toBe(error);
  });
});
