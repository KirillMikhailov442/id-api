import type { RefreshHash } from "@modules/session/domain/value-object/refresh-hash.value-object";

export interface IRefreshTokenService {
  generate(): string;
  hash(rawToken: string): RefreshHash;
}
