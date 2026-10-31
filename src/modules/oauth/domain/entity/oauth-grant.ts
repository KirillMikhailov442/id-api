import type { ClientId, OAuthGrantId, OAuthRefreshTokenId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export interface OAuthGrant {
  id: OAuthGrantId;
  userId: UserId;
  clientId: ClientId;
  scopes: string[];
  audience: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessExpiresAt: Date;
  revokedAt: Date | null;
}

export interface OAuthRefreshToken {
  id: OAuthRefreshTokenId;
  grantId: OAuthGrantId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}
