export class ClientCreatedEvent {
  constructor(
    public readonly clientId: string,
    public readonly userId: string,
    public readonly name: string
  ) {}
}
