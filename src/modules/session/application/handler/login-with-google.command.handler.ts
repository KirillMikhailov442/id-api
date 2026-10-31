import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { LoginWithGoogleCommand } from "@modules/session/application/command/login-with-google.command";
import type { LoginResult } from "@modules/session/application/command/login.command";
import type { IExternalLoginClient } from "@modules/session/application/port/external-login-client.type";
import type { ILoginAttemptStore } from "@modules/session/application/port/login-attempt-store.type";
import { SessionIssuer } from "@modules/session/application/session-issuer";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { GOOGLE_LOGIN_CLIENT, LOGIN_ATTEMPT_STORE } from "@modules/session/session.tokens";
import {
  IdentityProvider,
  ResolveExternalUserCommand,
  type ResolveExternalUserResult,
} from "@modules/user/user.module";

@CommandHandler(LoginWithGoogleCommand)
export class LoginWithGoogleCommandHandler implements ICommandHandler<LoginWithGoogleCommand, LoginResult> {
  constructor(
    @Inject(GOOGLE_LOGIN_CLIENT) private readonly client: IExternalLoginClient,
    @Inject(LOGIN_ATTEMPT_STORE) private readonly attempts: ILoginAttemptStore,
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    @Inject(SessionIssuer) private readonly sessionIssuer: SessionIssuer
  ) {}

  async execute(command: LoginWithGoogleCommand): Promise<LoginResult> {
    if (
      command.state === undefined ||
      command.state.length === 0 ||
      command.browserBinding === undefined ||
      command.browserBinding.length === 0
    ) {
      throw new InvalidCredentialsException("Invalid Google login state");
    }

    const attempt = await this.attempts.consume(command.state, command.browserBinding);

    if (attempt === null || command.error !== undefined || command.code === undefined || command.code.length === 0) {
      throw new InvalidCredentialsException("Google login expired, denied or already used");
    }

    const profile = await this.client.authenticate(command.code, attempt.nonce, attempt.codeVerifier);
    const user = await this.commandBus.execute<ResolveExternalUserCommand, ResolveExternalUserResult>(
      new ResolveExternalUserCommand(
        IdentityProvider.Google,
        profile.providerUserId,
        profile.email,
        profile.emailConfirmed,
        profile.name,
        profile.surname
      )
    );

    return this.sessionIssuer.create(user, command.deviceInfo, command.ip);
  }
}
