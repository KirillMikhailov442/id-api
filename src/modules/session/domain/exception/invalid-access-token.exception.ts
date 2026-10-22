export class InvalidAccessTokenException extends Error {
  constructor(message = "Invalid access token") {
    super(message);
    this.name = "InvalidAccessTokenException";
  }
}
