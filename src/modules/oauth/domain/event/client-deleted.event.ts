export class ClientDeletedEvent {
  public readonly clientId: string;
  public readonly userId: string;

  constructor(clientId: string, userId: string) {
    this.clientId = clientId;
    this.userId = userId;
  }
}
