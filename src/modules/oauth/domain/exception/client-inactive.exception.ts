export class ClientInactiveException extends Error {
  constructor(message = "Client is inactive") {
    super(message);
    this.name = "ClientInactiveException";
  }
}
