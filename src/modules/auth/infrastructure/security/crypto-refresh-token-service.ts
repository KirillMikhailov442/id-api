import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

import type { IRefreshTokenService } from "@modules/auth/application/port/refresh-token-service";
import { RefreshHash } from "@modules/auth/domain/value-object/refresh-hash.value-object";

const TOKEN_BYTES = 32;
const SHA256_ALGORITHM = "sha256";

@Injectable()
export class CryptoRefreshTokenService implements IRefreshTokenService {
  generate(): string {
    return randomBytes(TOKEN_BYTES).toString("base64url");
  }

  hash(rawToken: string): RefreshHash {
    const digest = createHash(SHA256_ALGORITHM).update(rawToken).digest("hex");

    return new RefreshHash(digest);
  }
}
