import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";

export type AccessTokenPayload = AuthenticatedUser;

export interface ITokenService {
  issueAccessToken(payload: AccessTokenPayload): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
}
