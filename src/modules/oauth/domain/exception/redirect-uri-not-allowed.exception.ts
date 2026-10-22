export class RedirectUriNotAllowedException extends Error {
  constructor(message = "Redirect uri is not registered for the client") {
    super(message);
    this.name = "RedirectUriNotAllowedException";
  }
}
