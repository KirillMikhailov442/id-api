export class ListActiveSessionsQuery {
  readonly userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}
