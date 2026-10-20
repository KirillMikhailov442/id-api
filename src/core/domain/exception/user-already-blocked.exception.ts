export class UserAlreadyBlockedException extends Error {
  constructor(message = "User is already blocked") {
    super(message);
    this.name = "UserAlreadyBlockedException";
  }
}
