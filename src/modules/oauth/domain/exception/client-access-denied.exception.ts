export class ClientAccessDeniedException extends Error {
  constructor(message = "Access to the client is denied") {
    super(message);
    this.name = "ClientAccessDeniedException";
  }
}
