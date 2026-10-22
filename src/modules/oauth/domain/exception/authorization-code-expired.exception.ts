export class AuthorizationCodeExpiredException extends Error {
  constructor(message = "Authorization code is expired") {
    super(message);
    this.name = "AuthorizationCodeExpiredException";
  }
}
