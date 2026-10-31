import type { Requester } from "@modules/oauth/application/type/requester.type";

export class GetClientQuery {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string
  ) {}
}
