export class RoleNotFoundException extends Error {
  constructor(message = "Role not found") {
    super(message);
    this.name = "RoleNotFoundException";
  }
}
