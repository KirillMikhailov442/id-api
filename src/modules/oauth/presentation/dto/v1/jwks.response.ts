import { ApiProperty } from "@nestjs/swagger";

import type { IdTokenPublicKey } from "@modules/oauth/application/port/id-token-public-key.type";
import { JwkDto } from "@modules/oauth/presentation/dto/v1/jwk.dto";

export class JwksResponse {
  @ApiProperty({
    type: [JwkDto],
    description: "JWKS keys array containing the current public signing key; no private key material is included",
  })
  keys: JwkDto[];

  constructor(keys: IdTokenPublicKey[]) {
    this.keys = keys.map((key) => new JwkDto(key));
  }
}
