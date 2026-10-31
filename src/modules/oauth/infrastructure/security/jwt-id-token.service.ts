import { createHash, createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions, type JwtVerifyOptions } from "@nestjs/jwt";
import { AbstractJwtTokenService } from "@shared/security/abstract-jwt-token.service";
import { isUUID } from "class-validator";

import type { IdTokenPublicKey } from "@modules/oauth/application/port/id-token-public-key.type";
import type { IdTokenPayload, IIdTokenService } from "@modules/oauth/application/port/id-token-service.type";
import { OAuthScope } from "@modules/oauth/domain/enum/oauth-scope.enum";

@Injectable()
export class JwtIdTokenService
  extends AbstractJwtTokenService<IdTokenPayload, string, IdTokenPayload, string>
  implements IIdTokenService
{
  readonly algorithm = "RS256" as const;
  private readonly verificationKey: string;
  private readonly privateKey: KeyObject;
  private readonly publicKey: IdTokenPublicKey;

  constructor(
    @Inject(JwtService)
    jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {
    super(jwtService);

    const privateKeyPem = configService.getOrThrow<string>("ID_TOKEN_PRIVATE_KEY").replace(/\\n/g, "\n");

    try {
      this.privateKey = createPrivateKey(privateKeyPem);
    } catch {
      throw new Error("ID_TOKEN_PRIVATE_KEY must contain a valid PEM private key");
    }

    if (
      this.privateKey.asymmetricKeyType !== "rsa" ||
      (this.privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048
    ) {
      throw new Error("ID_TOKEN_PRIVATE_KEY must be an RSA private key of at least 2048 bits");
    }

    const publicKey = createPublicKey(this.privateKey);
    this.verificationKey = publicKey.export({ format: "pem", type: "spki" }).toString();

    const jwk = publicKey.export({ format: "jwk" });

    if (jwk.n === undefined || jwk.e === undefined) {
      throw new Error("ID token public key must contain an RSA modulus and exponent");
    }

    const kid = createHash("sha256")
      .update(publicKey.export({ format: "der", type: "spki" }))
      .digest("base64url");
    this.publicKey = { kty: "RSA", use: "sig", alg: this.algorithm, kid, n: jwk.n, e: jwk.e };
  }

  get expiresIn(): number {
    return this.configService.getOrThrow<number>("ID_TOKEN_TTL");
  }

  get issuer(): string {
    return this.configService.getOrThrow<string>("APP_BASE_URL");
  }

  issueIdToken(payload: IdTokenPayload): Promise<string> {
    return this.issue(payload);
  }

  getPublicKeys(): IdTokenPublicKey[] {
    return [{ ...this.publicKey }];
  }

  protected buildClaims(payload: IdTokenPayload): Record<string, unknown> {
    const claims: Record<string, string> = {
      sub: payload.userId,
      scope: payload.scopes.join(" "),
    };

    if (payload.scopes.includes(OAuthScope.OpenId)) {
      if (payload.profile === undefined) {
        throw new Error("User profile is required for an ID token with openid scope");
      }

      claims.name = payload.profile.name;
      claims.surname = payload.profile.surname;
      claims.avatar = new URL(payload.profile.avatar, this.issuer).toString();
    }

    return claims;
  }

  protected signOptions(payload: IdTokenPayload): JwtSignOptions {
    return {
      privateKey: this.privateKey,
      keyid: this.publicKey.kid,
      audience: payload.clientId,
      issuer: this.issuer,
      header: { alg: this.algorithm, typ: "JWT" },
    };
  }

  protected buildResult(token: string): string {
    return token;
  }

  protected verifyOptions(clientId: string): JwtVerifyOptions {
    if (typeof clientId !== "string" || clientId.length === 0) {
      throw new UnauthorizedException("Expected ID token client is required");
    }

    return { publicKey: this.verificationKey, issuer: this.issuer, audience: clientId };
  }

  protected mapClaims(
    claims: Record<string, unknown>,
    header: Record<string, unknown>,
    clientId: string
  ): IdTokenPayload {
    if (
      header.typ !== "JWT" ||
      header.kid !== this.publicKey.kid ||
      typeof claims.sub !== "string" ||
      !isUUID(claims.sub) ||
      claims.aud !== clientId ||
      !Number.isSafeInteger(claims.exp) ||
      !Number.isSafeInteger(claims.iat) ||
      typeof claims.scope !== "string"
    ) {
      throw new UnauthorizedException("Invalid ID token claims");
    }

    const scopes = claims.scope.split(" ").filter(Boolean);
    const payload: IdTokenPayload = { userId: claims.sub, clientId, scopes };

    if (scopes.includes(OAuthScope.OpenId)) {
      if (typeof claims.name !== "string" || typeof claims.surname !== "string" || typeof claims.avatar !== "string") {
        throw new UnauthorizedException("Invalid ID token profile");
      }

      payload.profile = { name: claims.name, surname: claims.surname, avatar: claims.avatar };
    }

    return payload;
  }

  protected mapVerifyError(): Error {
    return new UnauthorizedException("Invalid or expired ID token");
  }
}
