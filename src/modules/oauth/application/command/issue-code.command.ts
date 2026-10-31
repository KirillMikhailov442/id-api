import type { Requester } from "@modules/oauth/application/type/requester.type";

export class IssueCodeCommand {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string,
    public readonly redirectUri: string,
    public readonly scopes: string[]
  ) {}
}
