import type { Requester } from "@modules/oauth/application/requester.type";

export class ListClientsQuery {
  constructor(
    public readonly requester: Requester,
    public readonly limit: number,
    public readonly offset: number
  ) {}
}
