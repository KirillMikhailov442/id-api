import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import { SessionIssuer } from "@modules/session/application/session-issuer";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import {
  Email,
  PASSWORD_HASHER,
  USER_REPOSITORY,
  type IPasswordHasher,
  type IUserRepository,
} from "@modules/user/user.module";

@CommandHandler(LoginCommand)
@Injectable()
export class LoginCommandHandler implements ICommandHandler<LoginCommand, LoginResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(SessionIssuer) private readonly sessionIssuer: SessionIssuer
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(new Email(command.email));
    const passwordHash = user?.getPasswordHash();

    if (
      user === null ||
      passwordHash === null ||
      passwordHash === undefined ||
      !(await this.passwordHasher.compare(command.password, passwordHash))
    ) {
      throw new InvalidCredentialsException();
    }

    return this.sessionIssuer.create(user, command.deviceInfo, command.ip);
  }
}
