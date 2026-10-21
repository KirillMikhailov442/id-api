export class UserBlockedException extends Error {
  constructor(message = "User is blocked") {
    super(message);
    this.name = "UserBlockedException";
  }
}
