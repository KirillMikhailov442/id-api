import type { Requester } from "@modules/oauth/application/requester.type";

export class DeleteClientCommand {
  public readonly requester: Requester;
  public readonly clientId: string;

  constructor(requester: Requester, clientId: string) {
    this.requester = requester;
    this.clientId = clientId;
  }
}
