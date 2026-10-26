export class DeleteRoleCommand {
  public readonly roleId: string;

  constructor(roleId: string) {
    this.roleId = roleId;
  }
}
