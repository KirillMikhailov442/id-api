import type { Requester } from "@modules/oauth/application/requester.type";

export class UnassignScopeCommand {
  public readonly requester: Requester;
  public readonly clientId: string;
  public readonly scopeName: string;

  constructor(requester: Requester, clientId: string, scopeName: string) {
    this.requester = requester;
    this.clientId = clientId;
    this.scopeName = scopeName;
  }
}
