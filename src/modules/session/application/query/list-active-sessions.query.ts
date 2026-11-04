export class ListActiveSessionsQuery {
  constructor(
    readonly userId: string,
    readonly limit: number = 20,
    readonly offset: number = 0,
    readonly search?: string
  ) {}
}
