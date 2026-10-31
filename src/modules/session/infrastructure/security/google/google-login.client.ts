import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

import type {
  ExternalProfile,
  IExternalLoginClient,
} from "@modules/session/application/port/external-login-client.type";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { GOOGLE_LOGIN_SCOPES } from "@modules/session/infrastructure/security/google/google-login.constants";

@Injectable()
export class GoogleLoginClient implements IExternalLoginClient {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  authorizationUrl(state: string, nonce: string, codeChallenge: string): string {
    return this.client().generateAuthUrl({
      scope: [...GOOGLE_LOGIN_SCOPES],
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });
  }

  async authenticate(code: string, nonce: string, codeVerifier: string): Promise<ExternalProfile> {
    const client = this.client();

    try {
      const { tokens } = await client.getToken({ code, codeVerifier });

      if (tokens.id_token === undefined || tokens.id_token === null || tokens.id_token.length === 0) {
        throw new InvalidCredentialsException();
      }

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.config.getOrThrow<string>("GOOGLE_CLIENT_ID"),
      });
      const payload = ticket.getPayload();

      if (
        !payload ||
        (payload as unknown as Record<string, unknown>).nonce !== nonce ||
        payload.sub.length === 0 ||
        payload.email === undefined ||
        payload.email.length === 0 ||
        payload.email_verified !== true
      ) {
        throw new InvalidCredentialsException();
      }

      const emailConfirmed = payload.email.toLowerCase().endsWith("@gmail.com") || Boolean(payload.hd);

      return {
        providerUserId: payload.sub,
        email: payload.email,
        emailConfirmed,
        name: this.profileName(payload.given_name, "Пользователь"),
        surname: this.profileName(payload.family_name, "Не указана"),
      };
    } catch {
      throw new InvalidCredentialsException("Google authentication failed");
    }
  }

  private client(): OAuth2Client {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    const redirectUri = this.config.get<string>("GOOGLE_REDIRECT_URI");

    if (
      clientId === undefined ||
      clientId.length === 0 ||
      clientSecret === undefined ||
      clientSecret.length === 0 ||
      redirectUri === undefined ||
      redirectUri.length === 0
    ) {
      throw new ServiceUnavailableException("Google sign-in is not configured");
    }

    return new OAuth2Client({
      clientId,
      clientSecret,
      redirectUri,
      transporterOptions: { timeout: this.config.getOrThrow<number>("EXTERNAL_LOGIN_HTTP_TIMEOUT") },
    });
  }

  private profileName(value: string | undefined, fallback: string): string {
    const name = value?.trim();

    return name !== undefined && name.length >= 2 && name.length <= 64 ? name : fallback;
  }
}
