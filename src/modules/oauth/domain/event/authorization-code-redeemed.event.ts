export class AuthorizationCodeRedeemedEvent {
  constructor(
    public readonly codeId: string,
    public readonly clientId: string,
    public readonly userId: string
  ) {}
}
