export class ValidateAuthorizationQuery {
  constructor(
    public readonly clientId: string,
    public readonly redirectUri: string,
    public readonly scopes: string[]
  ) {}
}
