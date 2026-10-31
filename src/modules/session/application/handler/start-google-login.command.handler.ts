import { createHash, randomBytes } from "node:crypto";
import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import {
  StartGoogleLoginCommand,
  type StartGoogleLoginResult,
} from "@modules/session/application/command/start-google-login.command";
import type { IExternalLoginClient } from "@modules/session/application/port/external-login-client.type";
import type { ILoginAttemptStore } from "@modules/session/application/port/login-attempt-store.type";
import { GOOGLE_LOGIN_CLIENT, LOGIN_ATTEMPT_STORE } from "@modules/session/session.tokens";

@CommandHandler(StartGoogleLoginCommand)
export class StartGoogleLoginCommandHandler implements ICommandHandler<
  StartGoogleLoginCommand,
  StartGoogleLoginResult
> {
  constructor(
    @Inject(GOOGLE_LOGIN_CLIENT) private readonly client: IExternalLoginClient,
    @Inject(LOGIN_ATTEMPT_STORE) private readonly attempts: ILoginAttemptStore
  ) {}

  async execute(): Promise<StartGoogleLoginResult> {
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const browserBinding = randomBytes(32).toString("base64url");
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const authorizationUrl = this.client.authorizationUrl(state, nonce, codeChallenge);
    await this.attempts.save(state, browserBinding, { nonce, codeVerifier });

    return { authorizationUrl, browserBinding };
  }
}
