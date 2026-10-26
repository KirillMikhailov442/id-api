import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { DeleteUserCommand } from "@modules/user/application/command/delete-user.command";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

@CommandHandler(DeleteUserCommand)
@Injectable()
export class DeleteUserCommandHandler implements ICommandHandler<DeleteUserCommand> {
  private readonly userRepository: IUserRepository;

  constructor(
    @Inject(USER_REPOSITORY)
    userRepository: IUserRepository
  ) {
    this.userRepository = userRepository;
  }

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    await this.userRepository.delete(command.userId);
  }
}
