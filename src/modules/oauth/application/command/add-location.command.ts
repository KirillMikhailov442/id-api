import type { Requester } from "@modules/oauth/application/requester.type";

export class AddLocationCommand {
  public readonly requester: Requester;
  public readonly clientId: string;
  public readonly href: string;

  constructor(requester: Requester, clientId: string, href: string) {
    this.requester = requester;
    this.clientId = clientId;
    this.href = href;
  }
}
