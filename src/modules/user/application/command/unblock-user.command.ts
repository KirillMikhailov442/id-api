export class UnblockUserCommand {
  public readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}
