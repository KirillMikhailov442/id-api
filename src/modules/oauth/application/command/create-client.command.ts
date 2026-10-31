import type { Requester } from "@modules/oauth/application/type/requester.type";

export class CreateClientCommand {
  constructor(
    public readonly requester: Requester,
    public readonly name: string,
    public readonly secret: string,
    public readonly location?: string,
    public readonly scopes: string[] = []
  ) {}
}
