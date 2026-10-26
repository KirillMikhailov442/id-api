import type { Requester } from "@modules/oauth/application/requester.type";

export class AssignScopesCommand {
  public readonly requester: Requester;
  public readonly clientId: string;
  public readonly scopeNames: string[];

  constructor(requester: Requester, clientId: string, scopeNames: string[]) {
    this.requester = requester;
    this.clientId = clientId;
    this.scopeNames = scopeNames;
  }
}
