import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { ChangePasswordCommand } from "@modules/user/application/command/change-password.command";
import type { IPasswordHasher } from "@modules/user/application/port/password-hasher";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import { InvalidOldPasswordException } from "@modules/user/domain/exception/invalid-old-password.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { PASSWORD_HASHER, TRANSACTION } from "@modules/user/user.tokens";

@CommandHandler(ChangePasswordCommand)
@Injectable()
export class ChangePasswordCommandHandler implements ICommandHandler<ChangePasswordCommand, void> {
  private readonly passwordHasher: IPasswordHasher;
  private readonly transaction: ITransaction;

  constructor(
    @Inject(PASSWORD_HASHER)
    passwordHasher: IPasswordHasher,
    @Inject(TRANSACTION)
    transaction: ITransaction
  ) {
    this.passwordHasher = passwordHasher;
    this.transaction = transaction;
  }

  async execute(command: ChangePasswordCommand): Promise<void> {
    await this.transaction.run(async (context) => {
      const user = await context.userRepository.findById(command.userId);

      if (user === null) {
        throw new UserNotFoundException();
      }

      const previousPasswordHash = user.getPasswordHash();

      if (!(await this.passwordHasher.compare(command.oldPassword, previousPasswordHash))) {
        throw new InvalidOldPasswordException();
      }

      user.changePassword(await this.passwordHasher.hash(command.newPassword));
      const updated = await context.userRepository.updatePassword(user, previousPasswordHash);

      if (!updated) {
        throw new InvalidOldPasswordException();
      }
    });
  }
}
