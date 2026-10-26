import type { Requester } from "@modules/oauth/application/requester.type";

export class IssueCodeCommand {
  public readonly requester: Requester;
  public readonly clientId: string;
  public readonly redirectUri: string;
  public readonly scopes: string[];

  constructor(requester: Requester, clientId: string, redirectUri: string, scopes: string[]) {
    this.requester = requester;
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.scopes = scopes;
  }
}
