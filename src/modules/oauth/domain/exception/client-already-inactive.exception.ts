export class ClientAlreadyInactiveException extends Error {
  constructor(message = "Client is already inactive") {
    super(message);
    this.name = "ClientAlreadyInactiveException";
  }
}
