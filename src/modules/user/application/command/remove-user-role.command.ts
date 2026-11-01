export class RemoveUserRoleCommand {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly requesterRoles: readonly string[]
  ) {}
}
