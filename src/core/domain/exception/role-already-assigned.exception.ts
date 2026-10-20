export class RoleAlreadyAssignedException extends Error {
  constructor(message = "Role is already assigned to user") {
    super(message);
    this.name = "RoleAlreadyAssignedException";
  }
}
