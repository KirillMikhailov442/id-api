export class UserBlockedEvent {
  public readonly userId: string;
  public readonly email: string;
  public readonly reason: string | undefined;
  public readonly blockedAt: Date;

  constructor(userId: string, email: string, reason: string | undefined, blockedAt: Date) {
    this.userId = userId;
    this.email = email;
    this.reason = reason;
    this.blockedAt = blockedAt;
  }
}
