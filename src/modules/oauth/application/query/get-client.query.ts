import type { Requester } from "@modules/oauth/application/requester.type";

export class GetClientQuery {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string
  ) {}
}
