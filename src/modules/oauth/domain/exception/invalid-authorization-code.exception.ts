export class InvalidAuthorizationCodeException extends Error {
  constructor(message = "Authorization code is invalid") {
    super(message);
    this.name = "InvalidAuthorizationCodeException";
  }
}
