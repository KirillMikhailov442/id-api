export class UserBlockedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly reason: string | undefined,
    public readonly blockedAt: Date
  ) {}
}
