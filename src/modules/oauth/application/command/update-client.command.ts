import type { Requester } from "@modules/oauth/application/requester.type";

export class UpdateClientCommand {
  public readonly requester: Requester;
  public readonly clientId: string;
  public readonly name?: string;
  public readonly isActive?: boolean;
  public readonly location?: string;

  constructor(requester: Requester, clientId: string, name?: string, isActive?: boolean, location?: string) {
    this.requester = requester;
    this.clientId = clientId;
    this.name = name;
    this.isActive = isActive;
    this.location = location;
  }
}
