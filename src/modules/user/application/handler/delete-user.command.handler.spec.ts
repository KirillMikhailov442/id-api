import { testHandler } from "@shared/testing/handler-test.spec-support";

import { DeleteUserCommand } from "@modules/user/application/command/delete-user.command";
import { DeleteUserCommandHandler } from "@modules/user/application/handler/delete-user.command.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("DeleteUserCommandHandler", () => {
  let handler: DeleteUserCommandHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let item: ReturnType<typeof makeUser>;

  beforeEach(async () => {
    repositories = userRepositories();
    item = makeUser();
    repositories.userRepository.findById.mockResolvedValue(item);
    handler = await testHandler(DeleteUserCommandHandler, [
      { provide: USER_REPOSITORY, useValue: repositories.userRepository },
    ]);
  });

  it("deletes the requested entity", async () => {
    const result = await handler.execute(new DeleteUserCommand(item.getId().getValue()));
    expect(repositories.userRepository.findById).toHaveBeenCalledWith(UserId.from(item.getId().getValue()));
    expect(result).toBeUndefined();
    expect(repositories.userRepository.delete).toHaveBeenCalledWith(item.getId());
  });

  it("rejects a missing entity without writing", async () => {
    repositories.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new DeleteUserCommand(item.getId().getValue()))).rejects.toThrow(
      UserNotFoundException
    );
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });

  it("propagates repository failures", async () => {
    const error = new Error("lookup failed");
    repositories.userRepository.findById.mockRejectedValue(error);
    await expect(handler.execute(new DeleteUserCommand(item.getId().getValue()))).rejects.toBe(error);
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });
});
