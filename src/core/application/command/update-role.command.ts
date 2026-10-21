export class UpdateRoleCommand {
  constructor(
    public readonly roleId: string,
    public readonly name: string
  ) {}
}
