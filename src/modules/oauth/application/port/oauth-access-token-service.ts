import type { ITokenService } from "@shared/security/token-service";

export const OAUTH_ACCESS_TOKEN_SERVICE = Symbol("OAUTH_ACCESS_TOKEN_SERVICE");
export interface OAuthAccessClaims {
  userId: string;
  clientId: string;
  grantId: string;
  scopes: string[];
}
export interface IssuedOAuthAccessToken {
  token: string;
  expiresAt: Date;
  expiresIn: number;
}

export type IOAuthAccessTokenService = ITokenService<OAuthAccessClaims, IssuedOAuthAccessToken>;
