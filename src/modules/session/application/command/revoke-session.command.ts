export class RevokeSessionCommand {
  constructor(
    readonly userId: string,
    readonly sessionId: string
  ) {}
}
