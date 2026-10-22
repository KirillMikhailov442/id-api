import type { Requester } from "@modules/oauth/application/requester.type";

export class AssignScopesCommand {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string,
    public readonly scopeNames: string[]
  ) {}
}
