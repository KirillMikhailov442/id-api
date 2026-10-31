import { EventBus } from "@nestjs/cqrs";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { UnblockUserCommand } from "@modules/user/application/command/unblock-user.command";
import { UnblockUserCommandHandler } from "@modules/user/application/handler/unblock-user.command.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { UserAlreadyUnblockedException } from "@modules/user/domain/exception/user-already-unblocked.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("UnblockUserCommandHandler", () => {
  let handler: UnblockUserCommandHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let user: ReturnType<typeof makeUser>;
  const publish = jest.fn();

  beforeEach(async () => {
    repositories = userRepositories();
    user = makeUser();
    publish.mockReset();
    user.block();
    repositories.userRepository.findById.mockResolvedValue(user);
    handler = await testHandler(UnblockUserCommandHandler, [
      { provide: USER_REPOSITORY, useValue: repositories.userRepository },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  it("unblocks and saves the user", async () => {
    await expect(handler.execute(new UnblockUserCommand(user.getId().getValue()))).resolves.toBe(user);
    expect(user.getIsBlocked()).toBe(UserBlockedStatus.Active);
    expect(repositories.userRepository.save).toHaveBeenCalledWith(user);
  });

  it("rejects a missing user without saving or publishing", async () => {
    repositories.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new UnblockUserCommand(user.getId().getValue()))).rejects.toThrow(
      UserNotFoundException
    );
    expect(repositories.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects a user already in the requested state", async () => {
    user.unblock();
    await expect(handler.execute(new UnblockUserCommand(user.getId().getValue()))).rejects.toThrow(
      UserAlreadyUnblockedException
    );
    expect(repositories.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish when saving fails", async () => {
    const error = new Error("save failed");
    repositories.userRepository.save.mockRejectedValue(error);
    await expect(handler.execute(new UnblockUserCommand(user.getId().getValue()))).rejects.toBe(error);
    expect(publish).not.toHaveBeenCalled();
  });
});
