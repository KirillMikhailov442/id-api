export class EmailAlreadyConfirmedException extends Error {
  constructor(message = "Email is already confirmed") {
    super(message);
    this.name = "EmailAlreadyConfirmedException";
  }
}
