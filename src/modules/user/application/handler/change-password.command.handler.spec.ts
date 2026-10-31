import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { ChangePasswordCommand } from "@modules/user/application/command/change-password.command";
import { ChangePasswordCommandHandler } from "@modules/user/application/handler/change-password.command.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
import { InvalidOldPasswordException } from "@modules/user/domain/exception/invalid-old-password.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { PASSWORD_HASHER, TRANSACTION } from "@modules/user/user.tokens";

describe("ChangePasswordCommandHandler", () => {
  let repos: ReturnType<typeof userRepositories>;
  let handler: ChangePasswordCommandHandler;
  let user: ReturnType<typeof makeUser>;
  let command: ChangePasswordCommand;
  const hash = mockFn<IPasswordHasher["hash"]>();
  const compare = mockFn<IPasswordHasher["compare"]>();

  beforeEach(async () => {
    repos = userRepositories();
    user = makeUser();
    command = new ChangePasswordCommand(user.getId().getValue(), "OldP@ss1", "NewP@ss2");
    hash.mockReset();
    compare.mockReset();
    hash.mockResolvedValue("new-hash");
    compare.mockResolvedValue(true);
    repos.userRepository.findById.mockResolvedValue(user);
    repos.userRepository.updatePassword.mockResolvedValue(true);
    handler = await testHandler(ChangePasswordCommandHandler, [
      { provide: PASSWORD_HASHER, useValue: { hash, compare } },
      { provide: TRANSACTION, useValue: repos.transaction },
    ]);
  });

  it("checks the previous password and updates the hash conditionally", async () => {
    await handler.execute(command);
    expect(compare).toHaveBeenCalledWith("OldP@ss1", "password-hash");
    expect(hash).toHaveBeenCalledWith("NewP@ss2");
    expect(user.getPasswordHash()).toBe("new-hash");
    expect(repos.userRepository.updatePassword).toHaveBeenCalledWith(user, "password-hash");
  });

  it("rejects the same password before looking up the user", async () => {
    await expect(handler.execute(new ChangePasswordCommand(command.userId, "NewP@ss2", "NewP@ss2"))).rejects.toThrow(
      InvalidValueObjectException
    );
    expect(repos.userRepository.findById).not.toHaveBeenCalled();
  });

  it("rejects an invalid new password before persistence", async () => {
    await expect(handler.execute(new ChangePasswordCommand(command.userId, "OldP@ss1", "weak"))).rejects.toThrow(
      InvalidValueObjectException
    );
    expect(repos.userRepository.findById).not.toHaveBeenCalled();
  });

  it("rejects a missing user", async () => {
    repos.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(command)).rejects.toThrow(UserNotFoundException);
    expect(compare).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });

  it("rejects accounts without a local password", async () => {
    user = makeUser("ivan@example.com", null);
    repos.userRepository.findById.mockResolvedValue(user);
    await expect(handler.execute(command)).rejects.toThrow(InvalidOldPasswordException);
    expect(compare).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(repos.userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects an incorrect previous password", async () => {
    compare.mockResolvedValue(false);
    await expect(handler.execute(command)).rejects.toThrow(InvalidOldPasswordException);
    expect(hash).not.toHaveBeenCalled();
    expect(repos.userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it("rejects a concurrent password change", async () => {
    repos.userRepository.updatePassword.mockResolvedValue(false);
    await expect(handler.execute(command)).rejects.toThrow(InvalidOldPasswordException);
    expect(repos.userRepository.updatePassword).toHaveBeenCalledWith(user, "password-hash");
  });
});
