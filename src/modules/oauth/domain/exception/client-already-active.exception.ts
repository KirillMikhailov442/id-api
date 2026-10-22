export class ClientAlreadyActiveException extends Error {
  constructor(message = "Client is already active") {
    super(message);
    this.name = "ClientAlreadyActiveException";
  }
}
