import type { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import type { OAuthGrant, OAuthRefreshToken } from "@modules/oauth/domain/entity/oauth-grant";
import type { AuthorizationCodeId, ClientId, OAuthGrantId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export type OAuthGrantSummary = Pick<
  OAuthGrant,
  "id" | "clientId" | "scopes" | "createdAt" | "expiresAt" | "revokedAt"
> & {
  clientName: string;
};
export interface OAuthGrantPage {
  items: OAuthGrantSummary[];
  total: number;
}

export const OAUTH_GRANT_STORE = Symbol("OAUTH_GRANT_STORE");
export interface OAuthGrantContext {
  lockClient(id: ClientId): Promise<void>;
  revokeByClientScopes(clientId: ClientId, scopes: string[], at: Date): Promise<void>;
  lockAuthorizationCode(id: AuthorizationCodeId): Promise<AuthorizationCode | null>;
  consumeAuthorizationCode(id: AuthorizationCodeId): Promise<void>;
  findGrant(id: OAuthGrantId, lock?: boolean): Promise<OAuthGrant | null>;
  saveGrant(grant: OAuthGrant): Promise<void>;
  findRefreshToken(hash: string): Promise<OAuthRefreshToken | null>;
  saveRefreshToken(token: OAuthRefreshToken): Promise<void>;
  revokeGrant(id: OAuthGrantId, at: Date): Promise<void>;
}
export interface IOAuthGrantStore extends OAuthGrantContext {
  listByUserId(userId: UserId, limit: number, offset: number): Promise<OAuthGrantPage>;
  transaction<T>(work: (context: OAuthGrantContext) => Promise<T>): Promise<T>;
}
