export class ConfirmEmailCommand {
  public readonly token: string;

  constructor(token: string) {
    this.token = token;
  }
}
