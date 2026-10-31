import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  JsonWebTokenError,
  JwtService,
  NotBeforeError,
  TokenExpiredError,
  type JwtSignOptions,
  type JwtVerifyOptions,
} from "@nestjs/jwt";
import { AbstractJwtTokenService } from "@shared/security/abstract-jwt-token.service";

import type {
  EmailConfirmationTokenPayload,
  IEmailConfirmationTokenService,
} from "@modules/user/application/port/email-confirmation-token.port";
import { InvalidEmailConfirmationTokenException } from "@modules/user/domain/exception/invalid-email-confirmation-token.exception";

@Injectable()
export class JwtEmailConfirmationTokenService
  extends AbstractJwtTokenService<EmailConfirmationTokenPayload>
  implements IEmailConfirmationTokenService
{
  readonly algorithm = "HS256" as const;
  readonly audience = "email-confirmation";

  constructor(
    @Inject(JwtService)
    jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {
    super(jwtService);
  }

  get expiresIn(): number {
    return this.configService.getOrThrow<number>("EMAIL_CONFIRM_TTL");
  }

  protected buildClaims(payload: EmailConfirmationTokenPayload): Record<string, unknown> {
    return { sub: payload.userId, email: payload.email };
  }

  protected signOptions(): JwtSignOptions {
    return { audience: this.audience };
  }

  protected buildResult(token: string): string {
    return token;
  }

  protected verifyOptions(): JwtVerifyOptions {
    return { audience: this.audience };
  }

  protected mapClaims(claims: Record<string, unknown>): EmailConfirmationTokenPayload {
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

  protected mapVerifyError(error: unknown): Error {
    if (error instanceof TokenExpiredError) {
      return new InvalidEmailConfirmationTokenException("Email confirmation token is expired");
    }

    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      return new InvalidEmailConfirmationTokenException();
    }

    return error as Error;
  }
}
