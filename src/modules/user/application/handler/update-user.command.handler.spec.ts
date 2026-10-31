import { testHandler } from "@shared/testing/handler-test.spec-support";

import { UpdateUserCommand } from "@modules/user/application/command/update-user.command";
import { UpdateUserCommandHandler } from "@modules/user/application/handler/update-user.command.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { TRANSACTION } from "@modules/user/user.tokens";

describe("UpdateUserCommandHandler", () => {
  let repos: ReturnType<typeof userRepositories>;
  let user: ReturnType<typeof makeUser>;
  let handler: UpdateUserCommandHandler;

  beforeEach(async () => {
    repos = userRepositories();
    user = makeUser();
    user.confirmEmail();
    repos.userRepository.findById.mockResolvedValue(user);
    repos.userRepository.findByEmail.mockResolvedValue(null);
    handler = await testHandler(UpdateUserCommandHandler, [{ provide: TRANSACTION, useValue: repos.transaction }]);
  });

  it("updates profile fields and resets email confirmation", async () => {
    await expect(
      handler.execute(new UpdateUserCommand(user.getId().getValue(), "Petr", "Petrov", "new@example.com"))
    ).resolves.toBe(user);
    expect(user.getName().getValue()).toBe("Petr");
    expect(user.getSurname().getValue()).toBe("Petrov");
    expect(user.getEmail().getValue()).toBe("new@example.com");
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Unconfirmed);
    expect(repos.userRepository.save).toHaveBeenCalledWith(user);
  });

  it("preserves omitted fields and does not check email uniqueness", async () => {
    await handler.execute(new UpdateUserCommand(user.getId().getValue(), "Petr"));
    expect(user.getEmail().getValue()).toBe("ivan@example.com");
    expect(user.getSurname().getValue()).toBe("Ivanov");
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Confirmed);
    expect(repos.userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it("skips uniqueness lookup for an unchanged email", async () => {
    await handler.execute(new UpdateUserCommand(user.getId().getValue(), undefined, undefined, "ivan@example.com"));
    expect(repos.userRepository.findByEmail).not.toHaveBeenCalled();
  });

  it("rejects a missing user", async () => {
    repos.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new UpdateUserCommand(user.getId().getValue(), "Petr"))).rejects.toThrow(
      UserNotFoundException
    );
    expect(repos.userRepository.save).not.toHaveBeenCalled();
  });

  it("rejects an email owned by another user before mutating", async () => {
    repos.userRepository.findByEmail.mockResolvedValue(makeUser("new@example.com"));
    await expect(
      handler.execute(new UpdateUserCommand(user.getId().getValue(), "Petr", undefined, "new@example.com"))
    ).rejects.toThrow(EmailAlreadyRegisteredException);
    expect(user.getName().getValue()).toBe("Ivan");
    expect(repos.userRepository.save).not.toHaveBeenCalled();
  });
});
