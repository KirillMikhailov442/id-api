import type { Requester } from "@modules/oauth/application/type/requester.type";

export class ListClientsQuery {
  constructor(
    public readonly requester: Requester,
    public readonly limit: number,
    public readonly offset: number,
    public readonly search?: string
  ) {}
}
