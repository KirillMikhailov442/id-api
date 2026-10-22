import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JsonWebTokenError, JwtService, NotBeforeError, TokenExpiredError } from "@nestjs/jwt";

import type {
  EmailConfirmationTokenPayload,
  IEmailConfirmationTokenService,
} from "@modules/user/application/port/email-confirmation-token.port";
import { InvalidEmailConfirmationTokenException } from "@modules/user/domain/exception/invalid-email-confirmation-token.exception";

const AUDIENCE = "email-confirmation";
const EMAIL_CONFIRM_TTL_KEY = "EMAIL_CONFIRM_TTL";
const USER_ID_CLAIM = "sub";
const EMAIL_CLAIM = "email";

interface JwtClaims {
  sub?: unknown;
  email?: unknown;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
}

@Injectable()
export class JwtEmailConfirmationTokenService implements IEmailConfirmationTokenService {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  generate(payload: EmailConfirmationTokenPayload): Promise<string> {
    const expiresIn = this.configService.getOrThrow<number>(EMAIL_CONFIRM_TTL_KEY);

    return this.jwtService.signAsync(
      {
        [USER_ID_CLAIM]: payload.userId,
        [EMAIL_CLAIM]: payload.email,
      },
      { audience: AUDIENCE, expiresIn }
    );
  }

  async verify(token: string): Promise<EmailConfirmationTokenPayload> {
    const claims = await this.jwtService
      .verifyAsync<JwtClaims>(token, { audience: AUDIENCE })
      .catch((error: unknown) => {
        throw this.mapVerifyError(error);
      });

    return this.mapClaims(claims);
  }

  private mapClaims(claims: JwtClaims): EmailConfirmationTokenPayload {
    const userId = claims.sub;
    const email = claims.email;

    if (typeof userId !== "string" || userId.length === 0) {
      throw new InvalidEmailConfirmationTokenException("Token payload has no user");
    }
    if (typeof email !== "string" || email.length === 0) {
      throw new InvalidEmailConfirmationTokenException("Token payload has no email");
    }

    return { userId, email };
  }

  private mapVerifyError(error: unknown): Error {
    if (error instanceof TokenExpiredError) {
      return new InvalidEmailConfirmationTokenException("Email confirmation token is expired");
    }
    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      return new InvalidEmailConfirmationTokenException();
    }

    return error as Error;
  }
}
