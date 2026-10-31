import { createHash, createPrivateKey, createPublicKey, randomUUID, type KeyObject } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions, type JwtVerifyOptions } from "@nestjs/jwt";
import { AbstractJwtTokenService, type JwtTokenTiming } from "@shared/security/abstract-jwt-token.service";
import { isUUID } from "class-validator";

import type {
  IOAuthAccessTokenService,
  IssuedOAuthAccessToken,
  OAuthAccessClaims,
} from "@modules/oauth/application/port/oauth-access-token-service";

@Injectable()
export class JwtOAuthAccessTokenService
  extends AbstractJwtTokenService<OAuthAccessClaims, IssuedOAuthAccessToken>
  implements IOAuthAccessTokenService
{
  readonly algorithm = "RS256" as const;
  private readonly privateKey: KeyObject;
  private readonly publicKey: string;
  private readonly kid: string;

  constructor(
    @Inject(JwtService)
    jwt: JwtService,
    @Inject(ConfigService)
    private readonly config: ConfigService
  ) {
    super(jwt);

    this.privateKey = createPrivateKey(config.getOrThrow<string>("ID_TOKEN_PRIVATE_KEY").replace(/\\n/g, "\n"));

    if (
      this.privateKey.asymmetricKeyType !== "rsa" ||
      (this.privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    ) {
      throw new Error("OAuth signing key must be RSA with at least 2048 bits");
    }

    const publicKey = createPublicKey(this.privateKey);
    this.publicKey = publicKey.export({ format: "pem", type: "spki" }).toString();
    this.kid = createHash("sha256")
      .update(publicKey.export({ format: "der", type: "spki" }))
      .digest("base64url");
  }

  get expiresIn(): number {
    return this.config.getOrThrow<number>("OAUTH_ACCESS_TTL");
  }

  get issuer(): string {
    return this.config.getOrThrow<string>("APP_BASE_URL");
  }

  get audience(): string {
    return this.config.getOrThrow<string>("OAUTH_AUDIENCE");
  }

  protected buildClaims(claims: OAuthAccessClaims): Record<string, unknown> {
    return {
      sub: claims.userId,
      client_id: claims.clientId,
      grant_id: claims.grantId,
      scope: claims.scopes.join(" "),
      jti: randomUUID(),
    };
  }

  protected signOptions(): JwtSignOptions {
    return {
      privateKey: this.privateKey,
      keyid: this.kid,
      header: { alg: this.algorithm, typ: "at+jwt" },
      issuer: this.issuer,
      audience: this.audience,
    };
  }

  protected buildResult(token: string, timing: JwtTokenTiming): IssuedOAuthAccessToken {
    return { token, expiresAt: new Date(timing.expiresAt * 1000), expiresIn: timing.expiresIn };
  }

  protected verifyOptions(): JwtVerifyOptions {
    return { publicKey: this.publicKey, issuer: this.issuer, audience: this.audience };
  }

  protected mapClaims(payload: Record<string, unknown>, header: Record<string, unknown>): OAuthAccessClaims {
    if (
      header.typ !== "at+jwt" ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number" ||
      typeof payload.jti !== "string" ||
      !isUUID(payload.jti) ||
      typeof payload.sub !== "string" ||
      !isUUID(payload.sub) ||
      typeof payload.client_id !== "string" ||
      !isUUID(payload.client_id) ||
      typeof payload.grant_id !== "string" ||
      !isUUID(payload.grant_id) ||
      typeof payload.scope !== "string"
    ) {
      throw new Error("Invalid OAuth access claims");
    }

    return {
      userId: payload.sub,
      clientId: payload.client_id,
      grantId: payload.grant_id,
      scopes: payload.scope.split(" ").filter(Boolean),
    };
  }

  protected mapVerifyError(): Error {
    return new UnauthorizedException("Invalid or expired OAuth access token");
  }
}
