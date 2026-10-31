import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { ConfirmEmailCommand } from "@modules/user/application/command/confirm-email.command";
import type { IEmailConfirmationTokenService } from "@modules/user/application/port/email-confirmation-token.port";
import type { IUserRepository } from "@modules/user/application/port/user-repository";
import type { User } from "@modules/user/domain/entity/user";
import { InvalidEmailConfirmationTokenException } from "@modules/user/domain/exception/invalid-email-confirmation-token.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { EMAIL_CONFIRMATION_TOKEN_SERVICE, USER_REPOSITORY } from "@modules/user/user.tokens";

@CommandHandler(ConfirmEmailCommand)
@Injectable()
export class ConfirmEmailCommandHandler implements ICommandHandler<ConfirmEmailCommand> {
  constructor(
    @Inject(EMAIL_CONFIRMATION_TOKEN_SERVICE)
    private readonly emailConfirmationTokenService: IEmailConfirmationTokenService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(command: ConfirmEmailCommand): Promise<User> {
    const payload = await this.emailConfirmationTokenService.verify(command.token);
    const user = await this.userRepository.findById(UserId.from(payload.userId));

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
