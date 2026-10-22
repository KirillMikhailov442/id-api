import type { Requester } from "@modules/oauth/application/requester.type";

export class UpdateClientCommand {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string,
    public readonly name?: string,
    public readonly isActive?: boolean
  ) {}
}
