export class InvalidEmailConfirmationTokenException extends Error {
  constructor(message = "Email confirmation token is invalid or expired") {
    super(message);
    this.name = "InvalidEmailConfirmationTokenException";
  }
}
