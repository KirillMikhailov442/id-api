import type { Requester } from "@modules/oauth/application/requester.type";

export class GetClientLocationsQuery {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string
  ) {}
}
