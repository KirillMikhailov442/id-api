import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { mapOptional } from "@shared/mapping/map-optional";

import { UpdateUserCommand } from "@modules/user/application/command/update-user.command";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import type { User } from "@modules/user/domain/entity/user";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import { Name } from "@modules/user/domain/value-object/name.value-object";
import { Surname } from "@modules/user/domain/value-object/surname.value-object";
import { UserId } from "@modules/user/user.ids";
import { TRANSACTION } from "@modules/user/user.tokens";

@CommandHandler(UpdateUserCommand)
@Injectable()
export class UpdateUserCommandHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject(TRANSACTION)
    private readonly transaction: ITransaction
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    const userId = UserId.from(command.userId);

    return this.transaction.run(async (context) => {
      const user = await context.userRepository.findById(userId);

      if (!user) {
        throw new UserNotFoundException();
      }

      if (command.email !== undefined) {
        const email = new Email(command.email);

        if (email.getValue() !== user.getEmail().getValue()) {
          const existingUser = await context.userRepository.findByEmail(email);

          if (existingUser) {
            throw new EmailAlreadyRegisteredException();
          }
        }
      }

      user.updateProfile({
        name: mapOptional(command.name, (value) => new Name(value)),
        surname: mapOptional(command.surname, (value) => new Surname(value)),
        email: mapOptional(command.email, (value) => new Email(value)),
      });
      await context.userRepository.save(user);

      return user;
    });
  }
}
