export class GetUserSessionQuery {
  constructor(
    readonly userId: string,
    readonly sessionId: string
  ) {}
}
