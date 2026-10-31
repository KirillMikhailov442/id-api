import { testHandler } from "@shared/testing/handler-test.spec-support";

import { GetUserQueryHandler } from "@modules/user/application/handler/get-user.query.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("GetUserQueryHandler", () => {
  let handler: GetUserQueryHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let item: ReturnType<typeof makeUser>;

  beforeEach(async () => {
    repositories = userRepositories();
    item = makeUser();
    repositories.userRepository.findById.mockResolvedValue(item);
    handler = await testHandler(GetUserQueryHandler, [
      { provide: USER_REPOSITORY, useValue: repositories.userRepository },
    ]);
  });

  it("returns the requested entity", async () => {
    const result = await handler.execute(new GetUserQuery(item.getId().getValue()));
    expect(repositories.userRepository.findById).toHaveBeenCalledWith(UserId.from(item.getId().getValue()));
    expect(result).toBe(item);
  });

  it("rejects a missing entity without writing", async () => {
    repositories.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new GetUserQuery(item.getId().getValue()))).rejects.toThrow(UserNotFoundException);
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });

  it("hides the super user unless explicitly requested", async () => {
    item = makeUser("mikhssoadmin@gmail.com");
    repositories.userRepository.findById.mockResolvedValue(item);
    await expect(handler.execute(new GetUserQuery(item.getId().getValue()))).rejects.toThrow(UserNotFoundException);
    await expect(handler.execute(new GetUserQuery(item.getId().getValue(), true))).resolves.toBe(item);
  });

  it("propagates repository failures", async () => {
    const error = new Error("lookup failed");
    repositories.userRepository.findById.mockRejectedValue(error);
    await expect(handler.execute(new GetUserQuery(item.getId().getValue()))).rejects.toBe(error);
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });
});
