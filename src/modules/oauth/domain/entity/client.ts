import { randomUUID } from "node:crypto";

import { ClientAlreadyActiveException } from "@modules/oauth/domain/exception/client-already-active.exception";
import { ClientAlreadyInactiveException } from "@modules/oauth/domain/exception/client-already-inactive.exception";
import type { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import type { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";

export const SECRET_HASH_MAX_LENGTH = 255;

export class Client {
  private readonly id: string;
  private readonly userId: string;
  private name: ClientName;
  private readonly secretHash: string;
  private isActive: boolean;
  private location: LocationHref | null;
  private readonly createdAt: Date;

  constructor(
    id: string,
    userId: string,
    name: ClientName,
    secretHash: string,
    isActive: boolean,
    createdAt: Date,
    location: LocationHref | null
  ) {
    this.id = id;
    this.userId = userId;
    this.name = name;
    this.secretHash = secretHash;
    this.isActive = isActive;
    this.createdAt = createdAt;
    this.location = location;
  }

  static create(params: { userId: string; name: ClientName; secretHash: string; location?: LocationHref }): Client {
    return new Client(
      randomUUID(),
      params.userId,
      params.name,
      params.secretHash,
      true,
      new Date(),
      params.location ?? null
    );
  }

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.userId;
  }

  getName(): ClientName {
    return this.name;
  }

  getSecretHash(): string {
    return this.secretHash;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  updateName(name: ClientName): void {
    if (name.getValue() === this.name.getValue()) {
      return;
    }

    this.name = name;
  }

  getLocation(): LocationHref | null {
    return this.location;
  }

  updateLocation(location: LocationHref): void {
    this.location = location;
  }

  activate(): void {
    if (this.isActive) {
      throw new ClientAlreadyActiveException();
    }

    this.isActive = true;
  }

  deactivate(): void {
    if (!this.isActive) {
      throw new ClientAlreadyInactiveException();
    }

    this.isActive = false;
  }
}
