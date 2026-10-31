import { EventBus } from "@nestjs/cqrs";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { CreateUserCommand } from "@modules/user/application/command/create-user.command";
import { CreateUserCommandHandler } from "@modules/user/application/handler/create-user.command.handler";
import { makeRole, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { PASSWORD_HASHER, TRANSACTION, USER_REPOSITORY } from "@modules/user/user.tokens";

describe("CreateUserCommandHandler", () => {
  let repos: ReturnType<typeof userRepositories>;
  let handler: CreateUserCommandHandler;
  const hash = mockFn<IPasswordHasher["hash"]>();
  const publish = jest.fn();
  const command = new CreateUserCommand("Ivan", "Ivanov", "ivan@example.com", "S3cureP@ssw0rd");

  beforeEach(async () => {
    repos = userRepositories();
    hash.mockReset();
    publish.mockReset();
    hash.mockResolvedValue("hashed-password");
    repos.userRepository.existsByEmail.mockResolvedValue(false);
    repos.roleRepository.findByName.mockResolvedValue(makeRole());
    handler = await testHandler(CreateUserCommandHandler, [
      { provide: USER_REPOSITORY, useValue: repos.userRepository },
      { provide: PASSWORD_HASHER, useValue: { hash } },
      { provide: TRANSACTION, useValue: repos.transaction },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  it("hashes the password, persists the user and role, then publishes creation", async () => {
    const user = await handler.execute(command);
    expect(hash).toHaveBeenCalledWith(command.password);
    expect(user.getPasswordHash()).toBe("hashed-password");
    expect(user.getEmail().getValue()).toBe(command.email);
    expect(user.getRoles()).toHaveLength(1);
    expect(repos.userRepository.save).toHaveBeenCalledWith(user);
    expect(repos.userRoleRepository.save).toHaveBeenCalledWith(user.getRoles()[0]);
    expect(publish).toHaveBeenCalledWith(
      new UserCreatedEvent(user.getId(), user.getEmail(), user.getName(), user.getIsConfirmed())
    );
  });

  it("rejects an existing email before hashing or saving", async () => {
    repos.userRepository.existsByEmail.mockResolvedValue(true);
    await expect(handler.execute(command)).rejects.toThrow(EmailAlreadyRegisteredException);
    expect(hash).not.toHaveBeenCalled();
    expect(repos.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not save or publish when the default role is missing", async () => {
    repos.roleRepository.findByName.mockResolvedValue(null);
    await expect(handler.execute(command)).rejects.toThrow(RoleNotFoundException);
    expect(repos.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish when persistence fails", async () => {
    const error = new Error("save failed");
    repos.userRepository.save.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(repos.userRoleRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});
