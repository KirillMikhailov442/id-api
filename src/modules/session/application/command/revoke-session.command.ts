export class RevokeSessionCommand {
  readonly userId: string;
  readonly sessionId: string;

  constructor(userId: string, sessionId: string) {
    this.userId = userId;
    this.sessionId = sessionId;
  }
}
