import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { UpdateUserCommand } from "@modules/user/application/command/update-user.command";
import type { ITransaction, ITransactionContext } from "@modules/user/application/port/transaction.port";
import type { User } from "@modules/user/domain/entity/user";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { Name } from "@modules/user/domain/value-object/name.value-object";
import { Surname } from "@modules/user/domain/value-object/surname.value-object";
import { TRANSACTION } from "@modules/user/user.tokens";

@CommandHandler(UpdateUserCommand)
@Injectable()
export class UpdateUserCommandHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(@Inject(TRANSACTION) private readonly transaction: ITransaction) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    return this.transaction.run(async (context) => {
      const user = await context.userRepository.findById(command.userId);

      if (!user) {
        throw new UserNotFoundException();
      }

      if (command.email) {
        const email = new Email(command.email);

        if (email.getValue() !== user.getEmail().getValue()) {
          const existingUser = await context.userRepository.findByEmail(email);

          if (existingUser) {
            throw new EmailAlreadyRegisteredException();
          }
        }
      }

      user.updateProfile({
        name: command.name ? new Name(command.name) : undefined,
        surname: command.surname ? new Surname(command.surname) : undefined,
        email: command.email ? new Email(command.email) : undefined,
      });

      await context.userRepository.save(user);
      await this.syncUserRoles(context, user);

      return user;
    });
  }

  private async syncUserRoles(context: ITransactionContext, user: User): Promise<void> {
    const targetRoleIds = new Set(user.getRoles().map((userRole) => userRole.getRoleId()));
    const existingRoles = await context.userRoleRepository.findByUserId(user.getId());
    const existingRoleIds = new Set(existingRoles.map((role) => role.getId()));

    for (const userRole of user.getRoles()) {
      if (!existingRoleIds.has(userRole.getRoleId())) {
        await context.userRoleRepository.save(userRole);
      }
    }

    for (const roleId of existingRoleIds) {
      if (!targetRoleIds.has(roleId)) {
        await context.userRoleRepository.delete(user.getId(), roleId);
      }
    }
  }
}
