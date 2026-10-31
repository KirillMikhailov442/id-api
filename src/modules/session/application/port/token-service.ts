import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";

export type AccessTokenPayload = AuthenticatedUser;

export interface IssuedAccessToken {
  token: string;
  expiresAt: Date;
}
