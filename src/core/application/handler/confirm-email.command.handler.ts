import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { ConfirmEmailCommand } from "@core/application/command/confirm-email.command";
import type { IEmailConfirmationTokenService } from "@core/application/port/email-confirmation-token.port";
import type { IUserRepository } from "@core/application/port/user-repository";
import { EMAIL_CONFIRMATION_TOKEN_SERVICE, USER_REPOSITORY } from "@core/core.tokens";
import type { User } from "@core/domain/entity/user";
import { InvalidEmailConfirmationTokenException } from "@core/domain/exception/invalid-email-confirmation-token.exception";
import { UserNotFoundException } from "@core/domain/exception/user-not-found.exception";

@CommandHandler(ConfirmEmailCommand)
@Injectable()
export class ConfirmEmailCommandHandler implements ICommandHandler<ConfirmEmailCommand> {
  constructor(
    @Inject(EMAIL_CONFIRMATION_TOKEN_SERVICE)
    private readonly emailConfirmationTokenService: IEmailConfirmationTokenService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository
  ) {}

  async execute(command: ConfirmEmailCommand): Promise<User> {
    const payload = await this.emailConfirmationTokenService.verify(command.token);
    const user = await this.userRepository.findById(payload.userId);

    if (user === null) {
      throw new UserNotFoundException();
    }

    if (user.getEmail().getValue() !== payload.email) {
      throw new InvalidEmailConfirmationTokenException();
    }

    user.confirmEmail();
    await this.userRepository.save(user);

    return user;
  }
}
