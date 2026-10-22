import type { Requester } from "@modules/oauth/application/requester.type";

export class AddLocationCommand {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string,
    public readonly href: string
  ) {}
}
