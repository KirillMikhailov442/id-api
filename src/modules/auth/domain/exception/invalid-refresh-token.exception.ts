export class InvalidRefreshTokenException extends Error {
  constructor(message = "Invalid refresh token") {
    super(message);
    this.name = "InvalidRefreshTokenException";
  }
}
