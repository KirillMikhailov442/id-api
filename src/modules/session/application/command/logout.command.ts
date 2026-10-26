export class LogoutCommand {
  public readonly refreshToken: string;

  constructor(refreshToken: string) {
    this.refreshToken = refreshToken;
  }
}
