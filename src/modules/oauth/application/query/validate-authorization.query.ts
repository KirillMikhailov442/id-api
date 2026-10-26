export class ValidateAuthorizationQuery {
  public readonly clientId: string;
  public readonly redirectUri: string;
  public readonly scopes: string[];

  constructor(clientId: string, redirectUri: string, scopes: string[]) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.scopes = scopes;
  }
}
