export class ClientDeletedEvent {
  constructor(
    public readonly clientId: string,
    public readonly userId: string
  ) {}
}
