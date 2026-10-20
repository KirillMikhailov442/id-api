import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { BlockUserCommand } from "@core/application/command/block-user.command";
import type { IUserRepository } from "@core/application/port/user-repository";
import { USER_REPOSITORY } from "@core/core.tokens";
import type { User } from "@core/domain/entity/user";
import { UserNotFoundException } from "@core/domain/exception/user-not-found.exception";

@CommandHandler(BlockUserCommand)
@Injectable()
export class BlockUserCommandHandler implements ICommandHandler<BlockUserCommand> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  async execute(command: BlockUserCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    user.block();
    await this.userRepository.save(user);

    return user;
  }
}
