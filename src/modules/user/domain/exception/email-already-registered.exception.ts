export class EmailAlreadyRegisteredException extends Error {
  constructor(message = "Email is already registered") {
    super(message);
    this.name = "EmailAlreadyRegisteredException";
  }
}
