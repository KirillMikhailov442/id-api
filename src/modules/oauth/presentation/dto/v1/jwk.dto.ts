import { ApiProperty } from "@nestjs/swagger";

import type { IdTokenPublicKey } from "@modules/oauth/application/port/id-token-public-key.type";

export class JwkDto {
  @ApiProperty({ enum: ["RSA"], example: "RSA", description: "Public key type" })
  kty: string;

  @ApiProperty({ enum: ["sig"], example: "sig", description: "Key is intended for signature verification" })
  use: string;

  @ApiProperty({ enum: ["RS256"], example: "RS256", description: "Allowed ID token signing algorithm" })
  alg: string;

  @ApiProperty({ description: "Stable signing key identifier; select this key when it matches the JWT kid header" })
  kid: string;

  @ApiProperty({ description: "Base64url-encoded RSA public modulus; used with e to import the public key" })
  n: string;

  @ApiProperty({ description: "Base64url-encoded RSA public exponent", example: "AQAB" })
  e: string;

  constructor(key: IdTokenPublicKey) {
    this.kty = key.kty;
    this.use = key.use;
    this.alg = key.alg;
    this.kid = key.kid;
    this.n = key.n;
    this.e = key.e;
  }
}
