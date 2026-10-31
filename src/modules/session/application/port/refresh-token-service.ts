import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
  expiresIn: number;
}

export interface IRefreshTokenService {
  readonly hashAlgorithm: "sha256";
  readonly expiresIn: number;

  issue(): Promise<IssuedRefreshToken>;
  hash(rawToken: string): RefreshHash;
}
