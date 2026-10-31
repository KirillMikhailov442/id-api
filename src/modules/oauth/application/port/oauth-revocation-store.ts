import type { OAuthGrantId } from "@modules/oauth/oauth.ids";

export const OAUTH_REVOCATION_STORE = Symbol("OAUTH_REVOCATION_STORE");
export interface IOAuthRevocationStore {
  revoke(grantId: OAuthGrantId, expiresAt: Date): Promise<void>;
  isRevoked(grantId: OAuthGrantId): Promise<boolean>;
}
