export class ListScopesQuery {
  public readonly limit: number;
  public readonly offset: number;

  constructor(limit: number, offset: number) {
    this.limit = limit;
    this.offset = offset;
  }
}
