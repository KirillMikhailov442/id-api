import type { Requester } from "@modules/oauth/application/requester.type";

export class RemoveLocationCommand {
  public readonly requester: Requester;
  public readonly clientId: string;
  public readonly locationId: string;

  constructor(requester: Requester, clientId: string, locationId: string) {
    this.requester = requester;
    this.clientId = clientId;
    this.locationId = locationId;
  }
}
