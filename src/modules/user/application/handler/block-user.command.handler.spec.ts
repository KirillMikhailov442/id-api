import { EventBus } from "@nestjs/cqrs";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { BlockUserCommand } from "@modules/user/application/command/block-user.command";
import { BlockUserCommandHandler } from "@modules/user/application/handler/block-user.command.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { UserBlockedEvent } from "@modules/user/domain/event/user-blocked.event";
import { UserAlreadyBlockedException } from "@modules/user/domain/exception/user-already-blocked.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("BlockUserCommandHandler", () => {
  let handler: BlockUserCommandHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let user: ReturnType<typeof makeUser>;
  const publish = jest.fn();

  beforeEach(async () => {
    repositories = userRepositories();
    user = makeUser();
    publish.mockReset();
    repositories.userRepository.findById.mockResolvedValue(user);
    handler = await testHandler(BlockUserCommandHandler, [
      { provide: USER_REPOSITORY, useValue: repositories.userRepository },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  it("blocks and saves the user before publishing an event", async () => {
    await expect(handler.execute(new BlockUserCommand(user.getId().getValue(), "abuse"))).resolves.toBe(user);
    expect(user.getIsBlocked()).toBe(UserBlockedStatus.Inactive);
    expect(repositories.userRepository.save).toHaveBeenCalledWith(user);
    expect(publish).toHaveBeenCalledWith(
      new UserBlockedEvent(user.getId(), user.getEmail(), "abuse", expect.any(Date) as unknown as Date)
    );
  });

  it("rejects a missing user without saving or publishing", async () => {
    repositories.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new BlockUserCommand(user.getId().getValue()))).rejects.toThrow(UserNotFoundException);
    expect(repositories.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects a user already in the requested state", async () => {
    user.block();
    await expect(handler.execute(new BlockUserCommand(user.getId().getValue()))).rejects.toThrow(
      UserAlreadyBlockedException
    );
    expect(repositories.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish when saving fails", async () => {
    const error = new Error("save failed");
    repositories.userRepository.save.mockRejectedValue(error);
    await expect(handler.execute(new BlockUserCommand(user.getId().getValue()))).rejects.toBe(error);
    expect(publish).not.toHaveBeenCalled();
  });
});
