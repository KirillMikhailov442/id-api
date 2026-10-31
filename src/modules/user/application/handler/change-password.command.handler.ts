import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";

import { ChangePasswordCommand } from "@modules/user/application/command/change-password.command";
import type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import { InvalidOldPasswordException } from "@modules/user/domain/exception/invalid-old-password.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { Password } from "@modules/user/domain/value-object/password.value-object";
import { UserId } from "@modules/user/user.ids";
import { PASSWORD_HASHER, TRANSACTION } from "@modules/user/user.tokens";

@CommandHandler(ChangePasswordCommand)
@Injectable()
export class ChangePasswordCommandHandler implements ICommandHandler<ChangePasswordCommand, void> {
  constructor(
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(TRANSACTION)
    private readonly transaction: ITransaction
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    const userId = UserId.from(command.userId);

    const password = new Password(command.newPassword);

    if (password.getValue() === command.oldPassword) {
      throw new InvalidValueObjectException("New password must be different from old password");
    }

    await this.transaction.run(async (context) => {
      const user = await context.userRepository.findById(userId);

      if (user === null) {
        throw new UserNotFoundException();
      }

      const previousPasswordHash = user.getPasswordHash();

      if (
        previousPasswordHash === null ||
        !(await this.passwordHasher.compare(command.oldPassword, previousPasswordHash))
      ) {
        throw new InvalidOldPasswordException();
      }

      user.changePassword(await this.passwordHasher.hash(password.getValue()));

      const updated = await context.userRepository.updatePassword(user, previousPasswordHash);

      if (!updated) {
        throw new InvalidOldPasswordException();
      }
    });
  }
}
