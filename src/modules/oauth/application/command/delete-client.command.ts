import type { Requester } from "@modules/oauth/application/type/requester.type";

export class DeleteClientCommand {
  constructor(
    public readonly requester: Requester,
    public readonly clientId: string
  ) {}
}
