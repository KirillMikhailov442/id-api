export class UserNotFoundException extends Error {
  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundException";
  }
}
