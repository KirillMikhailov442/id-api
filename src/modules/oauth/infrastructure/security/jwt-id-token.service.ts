import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import type { IdTokenPayload, IIdTokenService } from "@modules/oauth/application/port/id-token-service.type";

const ID_TOKEN_TTL_KEY = "ID_TOKEN_TTL";

const APP_BASE_URL_KEY = "APP_BASE_URL";

const USER_ID_CLAIM = "sub";

const SCOPES_CLAIM = "scope";

const SCOPE_SEPARATOR = " ";

@Injectable()
export class JwtIdTokenService implements IIdTokenService {
  private readonly jwtService: JwtService;
  private readonly configService: ConfigService;

  constructor(
    @Inject(JwtService)
    jwtService: JwtService,
    @Inject(ConfigService)
    configService: ConfigService
  ) {
    this.jwtService = jwtService;
    this.configService = configService;
  }

  issueIdToken(payload: IdTokenPayload): Promise<string> {
    const expiresIn = this.configService.getOrThrow<number>(ID_TOKEN_TTL_KEY);
    const issuer = this.configService.getOrThrow<string>(APP_BASE_URL_KEY);
    return this.jwtService.signAsync(
      {
        [USER_ID_CLAIM]: payload.userId,
        [SCOPES_CLAIM]: payload.scopes.join(SCOPE_SEPARATOR),
      },
      { audience: payload.clientId, issuer, expiresIn }
    );
  }
}
