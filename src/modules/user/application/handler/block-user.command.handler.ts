import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { BlockUserCommand } from "@modules/user/application/command/block-user.command";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { USER_REPOSITORY } from "@modules/user/user.tokens";
import type { User } from "@modules/user/domain/entity/user";
import { UserBlockedEvent } from "@modules/user/domain/event/user-blocked.event";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";

@CommandHandler(BlockUserCommand)
@Injectable()
export class BlockUserCommandHandler implements ICommandHandler<BlockUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(EventBus) private readonly eventBus: EventBus
  ) {}

  async execute(command: BlockUserCommand): Promise<User> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    user.block();
    await this.userRepository.save(user);

    this.eventBus.publish(new UserBlockedEvent(user.getId(), user.getEmail().getValue(), command.reason, new Date()));

    return user;
  }
}
