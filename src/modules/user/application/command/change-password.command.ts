export class ChangePasswordCommand {
  public readonly userId: string;
  public readonly oldPassword: string;
  public readonly newPassword: string;

  constructor(userId: string, oldPassword: string, newPassword: string) {
    this.userId = userId;
    this.oldPassword = oldPassword;
    this.newPassword = newPassword;
  }
}
