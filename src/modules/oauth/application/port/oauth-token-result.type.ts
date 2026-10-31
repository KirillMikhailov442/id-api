export interface OAuthTokenResult {
  clientId: string;
  userId: string;
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
}
