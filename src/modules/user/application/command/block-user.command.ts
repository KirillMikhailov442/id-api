export class BlockUserCommand {
  public readonly userId: string;
  public readonly reason?: string;

  constructor(userId: string, reason?: string) {
    this.userId = userId;
    this.reason = reason;
  }
}
