import type { ITokenService } from "@shared/security/token-service";

import type { IdTokenPublicKey } from "@modules/oauth/application/port/id-token-public-key.type";

export interface IdTokenProfile {
  name: string;
  surname: string;
  avatar: string;
}

export interface IdTokenPayload {
  userId: string;
  clientId: string;
  scopes: string[];
  profile?: IdTokenProfile;
}

export interface IIdTokenService extends ITokenService<IdTokenPayload, string, IdTokenPayload, string> {
  issueIdToken(payload: IdTokenPayload): Promise<string>;
  getPublicKeys(): IdTokenPublicKey[];
}
