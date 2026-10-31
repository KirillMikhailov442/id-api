import { EventBus } from "@nestjs/cqrs";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ResolveExternalUserCommand } from "@modules/user/application/command/resolve-external-user.command";
import { ResolveExternalUserCommandHandler } from "@modules/user/application/handler/resolve-external-user.command.handler";
import { makeRole, makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { TRANSACTION } from "@modules/user/user.tokens";

describe("ResolveExternalUserCommandHandler", () => {
  let repos: ReturnType<typeof userRepositories>;
  let handler: ResolveExternalUserCommandHandler;
  const publish = jest.fn();
  const command = new ResolveExternalUserCommand(
    IdentityProvider.Google,
    "google-id",
    "ivan@example.com",
    true,
    "Ivan",
    "Ivanov"
  );

  beforeEach(async () => {
    repos = userRepositories();
    publish.mockReset();
    repos.userIdentityRepository.findUserId.mockResolvedValue(null);
    repos.userRepository.existsByEmail.mockResolvedValue(false);
    repos.roleRepository.findByName.mockResolvedValue(makeRole());
    handler = await testHandler(ResolveExternalUserCommandHandler, [
      { provide: TRANSACTION, useValue: repos.transaction },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  it("returns an existing linked user without creating or publishing", async () => {
    const user = makeUser();
    repos.userIdentityRepository.findUserId.mockResolvedValue(user.getId());
    repos.userRepository.findById.mockResolvedValue(user);
    await expect(handler.execute(command)).resolves.toBe(user);
    expect(repos.userIdentityRepository.lock).toHaveBeenCalledWith(IdentityProvider.Google, "google-id");
    expect(repos.userRepository.existsByEmail).not.toHaveBeenCalled();
    expect(repos.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "creates an external account with confirmation=%s and links its identity",
    async (emailConfirmed) => {
      const user = await handler.execute(
        new ResolveExternalUserCommand(
          command.provider,
          command.providerUserId,
          command.email,
          emailConfirmed,
          command.name,
          command.surname
        )
      );
      expect(user.getPasswordHash()).toBeNull();
      expect(user.getIsConfirmed()).toBe(
        emailConfirmed ? UserEmailConfirmedStatus.Confirmed : UserEmailConfirmedStatus.Unconfirmed
      );
      expect(user.getRoles()).toHaveLength(1);
      expect(repos.userRepository.save).toHaveBeenCalledWith(user);
      expect(repos.userRoleRepository.save).toHaveBeenCalledWith(user.getRoles()[0]);
      expect(repos.userIdentityRepository.save).toHaveBeenCalledWith(
        command.provider,
        command.providerUserId,
        user.getId()
      );
      expect(publish).toHaveBeenCalledWith(
        new UserCreatedEvent(user.getId(), user.getEmail(), user.getName(), user.getIsConfirmed())
      );
    }
  );

  it("rejects a broken identity link", async () => {
    repos.userIdentityRepository.findUserId.mockResolvedValue(makeUser().getId());
    repos.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(command)).rejects.toThrow(UserNotFoundException);
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not automatically link an existing email", async () => {
    repos.userRepository.existsByEmail.mockResolvedValue(true);
    await expect(handler.execute(command)).rejects.toThrow(EmailAlreadyRegisteredException);
    expect(repos.userRepository.save).not.toHaveBeenCalled();
    expect(repos.userIdentityRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects a missing default role without saving", async () => {
    repos.roleRepository.findByName.mockResolvedValue(null);
    await expect(handler.execute(command)).rejects.toThrow(RoleNotFoundException);
    expect(repos.userRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish if identity persistence fails", async () => {
    const error = new Error("identity save failed");
    repos.userIdentityRepository.save.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(publish).not.toHaveBeenCalled();
  });
});
