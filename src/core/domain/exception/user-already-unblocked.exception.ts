export class UserAlreadyUnblockedException extends Error {
  constructor(message = "User is already unblocked") {
    super(message);
    this.name = "UserAlreadyUnblockedException";
  }
}
