import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { UnblockUserCommand } from "@modules/user/application/command/unblock-user.command";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import type { User } from "@modules/user/domain/entity/user";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

@CommandHandler(UnblockUserCommand)
@Injectable()
export class UnblockUserCommandHandler implements ICommandHandler<UnblockUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(command: UnblockUserCommand): Promise<User> {
    const userId = UserId.from(command.userId);

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    user.unblock();
    await this.userRepository.save(user);

    return user;
  }
}
