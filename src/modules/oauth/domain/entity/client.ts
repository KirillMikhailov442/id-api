import { randomUUID } from "node:crypto";

import { ClientAlreadyActiveException } from "@modules/oauth/domain/exception/client-already-active.exception";
import { ClientAlreadyInactiveException } from "@modules/oauth/domain/exception/client-already-inactive.exception";
import type { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";

export const SECRET_HASH_MAX_LENGTH = 255;

export class Client {
  constructor(
    private readonly id: string,
    private readonly userId: string,
    private name: ClientName,
    private readonly secretHash: string,
    private isActive: boolean,
    private readonly createdAt: Date
  ) {}

  static create(params: { userId: string; name: ClientName; secretHash: string }): Client {
    return new Client(randomUUID(), params.userId, params.name, params.secretHash, true, new Date());
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
