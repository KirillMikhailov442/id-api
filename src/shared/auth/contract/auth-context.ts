import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import type { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";

export interface SessionAuthContext extends AuthenticatedUser {
  type: AccessTokenType.Session;
}
export interface OAuthAuthContext {
  type: AccessTokenType.OAuth;
  userId: string;
  clientId: string;
  grantId: string;
  scopes: string[];
}
export type AuthContext = SessionAuthContext | OAuthAuthContext;
