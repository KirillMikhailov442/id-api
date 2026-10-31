import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListUsersQueryHandler } from "@modules/user/application/handler/list-users.query.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { ListUsersQuery } from "@modules/user/application/query/list-users.query";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("ListUsersQueryHandler", () => {
  it.each([0, 1])("returns users and a total for a page with %s items", async (size) => {
    const { userRepository } = userRepositories();
    const items = size === 0 ? [] : [makeUser()];
    userRepository.findAll.mockResolvedValue(items);
    userRepository.count.mockResolvedValue(12);

    const handler = await testHandler(ListUsersQueryHandler, [{ provide: USER_REPOSITORY, useValue: userRepository }]);
    await expect(handler.execute(new ListUsersQuery(5, 10))).resolves.toEqual({ items, total: 12 });
    expect(userRepository.findAll).toHaveBeenCalledWith({ limit: 5, offset: 10 });
    expect(userRepository.count).toHaveBeenCalledTimes(1);
  });

  it("propagates a count failure", async () => {
    const { userRepository } = userRepositories();
    const error = new Error("count failed");
    userRepository.findAll.mockResolvedValue([]);
    userRepository.count.mockRejectedValue(error);

    const handler = await testHandler(ListUsersQueryHandler, [{ provide: USER_REPOSITORY, useValue: userRepository }]);
    await expect(handler.execute(new ListUsersQuery(5, 0))).rejects.toBe(error);
  });
});
