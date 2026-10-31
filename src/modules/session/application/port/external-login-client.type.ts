export interface ExternalProfile {
  providerUserId: string;
  email: string;
  emailConfirmed: boolean;
  name: string;
  surname: string;
}

export interface IExternalLoginClient {
  authorizationUrl(state: string, nonce: string, codeChallenge: string): string;
  authenticate(code: string, nonce: string, codeVerifier: string): Promise<ExternalProfile>;
}
