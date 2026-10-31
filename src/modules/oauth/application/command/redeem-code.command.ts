export class RedeemCodeCommand {
  constructor(
    public readonly clientId: string,
    public readonly clientSecret: string,
    public readonly code: string,
    public readonly redirectUri?: string
  ) {}
}
