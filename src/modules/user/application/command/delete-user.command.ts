export class DeleteUserCommand {
  public readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}
