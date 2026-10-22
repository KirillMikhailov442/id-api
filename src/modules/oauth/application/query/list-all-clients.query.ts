export class ListAllClientsQuery {
  constructor(
    public readonly limit: number,
    public readonly offset: number
  ) {}
}
