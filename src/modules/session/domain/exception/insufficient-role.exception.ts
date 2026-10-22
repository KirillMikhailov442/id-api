export class InsufficientRoleException extends Error {
  constructor(message = "Insufficient role") {
    super(message);
    this.name = "InsufficientRoleException";
  }
}
