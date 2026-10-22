export class AuthorizationCodeAlreadyUsedException extends Error {
  constructor(message = "Authorization code has already been used") {
    super(message);
    this.name = "AuthorizationCodeAlreadyUsedException";
  }
}
