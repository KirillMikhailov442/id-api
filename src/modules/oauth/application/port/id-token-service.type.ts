export interface IdTokenPayload {
  userId: string;
  clientId: string;
  scopes: string[];
}

export interface IIdTokenService {
  issueIdToken(payload: IdTokenPayload): Promise<string>;
}
