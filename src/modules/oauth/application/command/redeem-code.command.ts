export class RedeemCodeCommand {
  public readonly clientId: string;
  public readonly clientSecret: string;
  public readonly code: string;
  public readonly redirectUri?: string;

  constructor(clientId: string, clientSecret: string, code: string, redirectUri?: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.code = code;
    this.redirectUri = redirectUri;
  }
}
