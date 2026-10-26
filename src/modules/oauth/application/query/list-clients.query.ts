import type { Requester } from "@modules/oauth/application/requester.type";

export class ListClientsQuery {
  public readonly requester: Requester;
  public readonly limit: number;
  public readonly offset: number;

  constructor(requester: Requester, limit: number, offset: number) {
    this.requester = requester;
    this.limit = limit;
    this.offset = offset;
  }
}
