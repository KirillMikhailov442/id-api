export class GetUserQuery {
  constructor(
    public readonly userId: string,
    public readonly requesterRoles: readonly string[] = []
  ) {}
}
