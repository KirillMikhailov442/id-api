import { ClientAlreadyActiveException } from "@modules/oauth/domain/exception/client-already-active.exception";
import { ClientAlreadyInactiveException } from "@modules/oauth/domain/exception/client-already-inactive.exception";
import type { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import type { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { ClientId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export const SECRET_HASH_MAX_LENGTH = 255;

export class Client {
  constructor(
    private readonly id: ClientId,
    private readonly userId: UserId,
    private name: ClientName,
    private readonly secretHash: string,
    private isActive: boolean,
    private readonly createdAt: Date,
    private location: LocationHref | null
  ) {}

  static create(params: { userId: UserId; name: ClientName; secretHash: string; location?: LocationHref }): Client {
    return new Client(
      ClientId.create(),
      params.userId,
      params.name,
      params.secretHash,
      true,
      new Date(),
      params.location ?? null
    );
  }

  getId(): ClientId {
    return this.id;
  }

  getUserId(): UserId {
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
