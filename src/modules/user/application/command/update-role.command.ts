export class UpdateRoleCommand {
  public readonly roleId: string;
  public readonly name: string;

  constructor(roleId: string, name: string) {
    this.roleId = roleId;
    this.name = name;
  }
}
