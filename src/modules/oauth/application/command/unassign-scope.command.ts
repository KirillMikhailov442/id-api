import type { Requester } from "@modules/oauth/application/type/requester.type";

export class UnassignScopeCommand {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string,
    public readonly scopeName: string
  ) {}
}
