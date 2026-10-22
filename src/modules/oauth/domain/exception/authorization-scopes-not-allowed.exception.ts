export class AuthorizationScopesNotAllowedException extends Error {
  constructor(message = "Requested scopes are not assigned to the client") {
    super(message);
    this.name = "AuthorizationScopesNotAllowedException";
  }
}
