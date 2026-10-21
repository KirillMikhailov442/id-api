import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JsonWebTokenError, JwtService, NotBeforeError, TokenExpiredError } from "@nestjs/jwt";

import type { AccessTokenPayload, ITokenService } from "@modules/auth/application/port/token-service";
import { AccessTokenExpiredException } from "@modules/auth/domain/exception/access-token-expired.exception";
import { InvalidAccessTokenException } from "@modules/auth/domain/exception/invalid-access-token.exception";

const JWT_ACCESS_TTL_KEY = "JWT_ACCESS_TTL";
const USER_ID_CLAIM = "sub";
const SESSION_ID_CLAIM = "sid";
const ROLES_CLAIM = "roles";

interface JwtClaims {
  sub?: unknown;
  sid?: unknown;
  roles?: unknown;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
}

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  issueAccessToken(payload: AccessTokenPayload): Promise<string> {
    const expiresIn = this.configService.getOrThrow<number>(JWT_ACCESS_TTL_KEY);

    return this.jwtService.signAsync(
      {
        [USER_ID_CLAIM]: payload.userId,
        [SESSION_ID_CLAIM]: payload.sessionId,
        [ROLES_CLAIM]: payload.roles,
      },
      { expiresIn }
    );
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const claims = await this.jwtService.verifyAsync<JwtClaims>(token).catch((error: unknown) => {
      throw this.mapVerifyError(error);
    });

    return this.mapClaims(claims);
  }

  private mapClaims(claims: JwtClaims): AccessTokenPayload {
    const userId = claims.sub;
    const sessionId = claims.sid;
    const roles = claims.roles;

    if (typeof userId !== "string" || userId.length === 0) {
      throw new InvalidAccessTokenException("Access token payload has no user");
    }
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      throw new InvalidAccessTokenException("Access token payload has no session");
    }
    if (!this.isValidRoles(roles)) {
      throw new InvalidAccessTokenException("Access token payload has invalid roles");
    }

    return { userId, sessionId, roles };
  }

  private isValidRoles(roles: unknown): roles is string[] {
    return Array.isArray(roles) && roles.every((role) => typeof role === "string");
  }

  private mapVerifyError(error: unknown): Error {
    if (error instanceof TokenExpiredError) {
      return new AccessTokenExpiredException();
    }
    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      return new InvalidAccessTokenException();
    }

    return error as Error;
  }
}
