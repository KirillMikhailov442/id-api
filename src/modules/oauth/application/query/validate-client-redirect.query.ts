export class ValidateClientRedirectQuery {
  constructor(
    public readonly clientId: string,
    public readonly redirectUri: string
  ) {}
}
