import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";

const CODE_BYTES = 32;

const SHA256_ALGORITHM = "sha256";

@Injectable()
export class CryptoAuthorizationCodeService implements IAuthorizationCodeService {
  generate(): string {
    return randomBytes(CODE_BYTES).toString("base64url");
  }

  hash(rawCode: string): CodeHash {
    const digest = createHash(SHA256_ALGORITHM).update(rawCode).digest("hex");

    return new CodeHash(digest);
  }
}
