import type { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";

export interface IAuthorizationCodeService {
  generate(): string;
  hash(rawCode: string): CodeHash;
}
