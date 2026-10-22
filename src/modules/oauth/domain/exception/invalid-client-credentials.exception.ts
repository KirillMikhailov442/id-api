export class InvalidClientCredentialsException extends Error {
  constructor(message = "Client credentials are invalid") {
    super(message);
    this.name = "InvalidClientCredentialsException";
  }
}
