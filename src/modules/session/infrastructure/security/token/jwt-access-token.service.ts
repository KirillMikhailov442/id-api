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
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";
import { AbstractJwtTokenService, type JwtTokenTiming } from "@shared/security/abstract-jwt-token.service";
import { isUUID } from "class-validator";

import type { AccessTokenPayload, IssuedAccessToken } from "@modules/session/application/port/token-service";
import { AccessTokenExpiredException } from "@modules/session/domain/exception/access-token-expired.exception";

@Injectable()
export class JwtAccessTokenService extends AbstractJwtTokenService<AccessTokenPayload, IssuedAccessToken> {
  readonly algorithm = "HS256" as const;

  constructor(
    @Inject(JwtService)
    jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {
    super(jwtService);
  }

  get expiresIn(): number {
    return this.configService.getOrThrow<number>("JWT_ACCESS_TTL");
  }

  protected buildClaims(payload: AccessTokenPayload): Record<string, unknown> {
    return {
      sub: payload.userId,
      sid: payload.sessionId,
      ver: payload.sessionVersion,
      roles: payload.roles,
    };
  }

  protected signOptions(): JwtSignOptions {
    return { header: { alg: this.algorithm, typ: "JWT" } };
  }

  protected buildResult(token: string, timing: JwtTokenTiming): IssuedAccessToken {
    return { token, expiresAt: new Date(timing.expiresAt * 1000) };
  }

  protected verifyOptions(): JwtVerifyOptions {
    return {};
  }

  protected mapClaims(claims: Record<string, unknown>, header: Record<string, unknown>): AccessTokenPayload {
    if (header.typ !== "JWT") throw new InvalidAccessTokenException("Invalid session token type");

    const userId = claims.sub;
    const sessionId = claims.sid;
    const roles = claims.roles;
    const sessionVersion = claims.ver;

    if (typeof userId !== "string" || !isUUID(userId)) {
      throw new InvalidAccessTokenException("Access token payload has no user");
    }

    if (typeof sessionId !== "string" || !isUUID(sessionId)) {
      throw new InvalidAccessTokenException("Access token payload has no session");
    }

    if (typeof sessionVersion !== "number" || !Number.isSafeInteger(sessionVersion) || sessionVersion < 1) {
      throw new InvalidAccessTokenException("Access token payload has invalid session version");
    }

    if (!Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat)) {
      throw new InvalidAccessTokenException("Session token must contain expiry and issuance time");
    }

    if (!this.isValidRoles(roles)) {
      throw new InvalidAccessTokenException("Access token payload has invalid roles");
    }

    return { userId, sessionId, sessionVersion, roles };
  }

  protected mapVerifyError(error: unknown): Error {
    if (error instanceof TokenExpiredError) {
      return new AccessTokenExpiredException();
    }

    if (error instanceof JsonWebTokenError || error instanceof NotBeforeError) {
      return new InvalidAccessTokenException();
    }

    return error as Error;
  }

  private isValidRoles(roles: unknown): roles is string[] {
    return Array.isArray(roles) && roles.every((role) => typeof role === "string");
  }
}
