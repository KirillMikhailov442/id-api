export class AuthorizationCodeIssuedEvent {
  public readonly codeId: string;
  public readonly clientId: string;
  public readonly userId: string;

  constructor(codeId: string, clientId: string, userId: string) {
    this.codeId = codeId;
    this.clientId = clientId;
    this.userId = userId;
  }
}
