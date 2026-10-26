export class ClientCreatedEvent {
  public readonly clientId: string;
  public readonly userId: string;
  public readonly name: string;

  constructor(clientId: string, userId: string, name: string) {
    this.clientId = clientId;
    this.userId = userId;
    this.name = name;
  }
}
