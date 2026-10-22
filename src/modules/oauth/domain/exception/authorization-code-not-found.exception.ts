export class AuthorizationCodeNotFoundException extends Error {
  constructor(message = "Authorization code not found") {
    super(message);
    this.name = "AuthorizationCodeNotFoundException";
  }
}
