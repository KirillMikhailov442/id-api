import type { Requester } from "@modules/oauth/application/requester.type";

export class CreateClientCommand {
  public readonly requester: Requester;
  public readonly name: string;
  public readonly secret: string;
  public readonly location?: string;

  constructor(requester: Requester, name: string, secret: string, location?: string) {
    this.requester = requester;
    this.name = name;
    this.secret = secret;
    this.location = location;
  }
}
