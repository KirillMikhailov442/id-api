import type { Requester } from "@modules/oauth/application/requester.type";

export class CreateClientCommand {
  public readonly requester: Requester;
  public readonly name: string;
  public readonly secret: string;
  public readonly locations?: string[];

  constructor(requester: Requester, name: string, secret: string, locations?: string[]) {
    this.requester = requester;
    this.name = name;
    this.secret = secret;
    this.locations = locations;
  }
}
