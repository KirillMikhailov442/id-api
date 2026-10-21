export class RoleAlreadyExistsException extends Error {
  constructor(message = "Role already exists") {
    super(message);
    this.name = "RoleAlreadyExistsException";
  }
}
