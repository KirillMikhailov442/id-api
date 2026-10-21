import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { UnblockUserCommand } from "@core/application/command/unblock-user.command";
import type { IUserRepository } from "@core/application/port/user-repository";
import { USER_REPOSITORY } from "@core/core.tokens";
import type { User } from "@core/domain/entity/user";
import { UserNotFoundException } from "@core/domain/exception/user-not-found.exception";

@CommandHandler(UnblockUserCommand)
@Injectable()
export class UnblockUserCommandHandler implements ICommandHandler<UnblockUserCommand> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  async execute(command: UnblockUserCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    user.unblock();
    await this.userRepository.save(user);

    return user;
  }
}
