export class ClientNotFoundException extends Error {
  constructor(message = "Client not found") {
    super(message);
    this.name = "ClientNotFoundException";
  }
}
