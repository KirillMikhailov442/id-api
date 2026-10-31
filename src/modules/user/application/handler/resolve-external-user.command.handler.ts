import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import {
  ResolveExternalUserCommand,
  type ResolveExternalUserResult,
} from "@modules/user/application/command/resolve-external-user.command";
import { DEFAULT_ROLE_NAME } from "@modules/user/application/handler/create-user.command.handler";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import { User } from "@modules/user/domain/entity/user";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { Name } from "@modules/user/domain/value-object/name.value-object";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { Surname } from "@modules/user/domain/value-object/surname.value-object";
import { TRANSACTION } from "@modules/user/user.tokens";

@CommandHandler(ResolveExternalUserCommand)
@Injectable()
export class ResolveExternalUserCommandHandler implements ICommandHandler<
  ResolveExternalUserCommand,
  ResolveExternalUserResult
> {
  constructor(
    @Inject(TRANSACTION) private readonly transaction: ITransaction,
    @Inject(EventBus) private readonly eventBus: EventBus
  ) {}

  async execute(command: ResolveExternalUserCommand): Promise<ResolveExternalUserResult> {
    const result = await this.transaction.run(async (context) => {
      await context.userIdentityRepository.lock(command.provider, command.providerUserId);

      const userId = await context.userIdentityRepository.findUserId(command.provider, command.providerUserId);

      if (userId !== null) {
        const user = await context.userRepository.findById(userId);

        if (user === null) {
          throw new UserNotFoundException();
        }

        return { user, created: false };
      }

      const email = new Email(command.email);

      if (await context.userRepository.existsByEmail(email)) {
        throw new EmailAlreadyRegisteredException(
          "Email already belongs to an existing account; automatic provider linking is disabled"
        );
      }

      const user = User.create({
        name: new Name(command.name),
        surname: new Surname(command.surname),
        email,
        passwordHash: null,
      });

      if (command.emailConfirmed) {
        user.confirmEmail();
      }

      const role = await context.roleRepository.findByName(new RoleName(DEFAULT_ROLE_NAME));

      if (role === null) {
        throw new RoleNotFoundException();
      }

      user.assignRole(role);
      await context.userRepository.save(user);

      for (const userRole of user.getRoles()) {
        await context.userRoleRepository.save(userRole);
      }

      await context.userIdentityRepository.save(command.provider, command.providerUserId, user.getId());

      return { user, created: true };
    });

    if (result.created) {
      this.eventBus.publish(
        new UserCreatedEvent(
          result.user.getId(),
          result.user.getEmail(),
          result.user.getName(),
          result.user.getIsConfirmed()
        )
      );
    }

    return result.user;
  }
}
