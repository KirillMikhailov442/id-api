import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { IRefreshTokenService, IssuedRefreshToken } from "@modules/session/application/port/refresh-token-service";
import { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";

@Injectable()
export class RefreshTokenService implements IRefreshTokenService {
  readonly hashAlgorithm = "sha256" as const;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  get expiresIn(): number {
    return this.configService.getOrThrow<number>("REFRESH_TOKEN_TTL");
  }

  async issue(): Promise<IssuedRefreshToken> {
    const expiresIn = this.expiresIn;
    const token = randomBytes(32).toString("base64url");

    return { token, expiresAt: new Date(Date.now() + expiresIn * 1000), expiresIn };
  }

  hash(rawToken: string): RefreshHash {
    const digest = createHash(this.hashAlgorithm).update(rawToken).digest("hex");

    return new RefreshHash(digest);
  }
}
