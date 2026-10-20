import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { DeleteUserCommand } from "@core/application/command/delete-user.command";
import type { IUserRepository } from "@core/application/port/user-repository";
import { USER_REPOSITORY } from "@core/core.tokens";
import { UserNotFoundException } from "@core/domain/exception/user-not-found.exception";

@CommandHandler(DeleteUserCommand)
@Injectable()
export class DeleteUserCommandHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    await this.userRepository.delete(command.userId);
  }
}
