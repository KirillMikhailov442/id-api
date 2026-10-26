import { randomUUID } from "node:crypto";

import type { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";

export class Location {
  private readonly id: string;
  private readonly clientId: string;
  private readonly href: LocationHref;
  private readonly createdAt: Date;

  constructor(id: string, clientId: string, href: LocationHref, createdAt: Date) {
    this.id = id;
    this.clientId = clientId;
    this.href = href;
    this.createdAt = createdAt;
  }

  static create(params: { clientId: string; href: LocationHref }): Location {
    return new Location(randomUUID(), params.clientId, params.href, new Date());
  }

  getId(): string {
    return this.id;
  }

  getClientId(): string {
    return this.clientId;
  }

  getHref(): LocationHref {
    return this.href;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }
}
