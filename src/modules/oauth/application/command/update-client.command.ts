import type { Requester } from "@modules/oauth/application/type/requester.type";

export class UpdateClientCommand {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string,
    public readonly name?: string,
    public readonly isActive?: boolean,
    public readonly location?: string
  ) {}
}
