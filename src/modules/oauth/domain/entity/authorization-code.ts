import { randomUUID } from "node:crypto";

import { AuthorizationCodeAlreadyUsedException } from "@modules/oauth/domain/exception/authorization-code-already-used.exception";
import type { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import type { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import type { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";

export class AuthorizationCode {
  private readonly id: string;
  private readonly clientId: string;
  private readonly userId: string;
  private readonly codeHash: CodeHash;
  private readonly scopes: CodeScopes;
  private readonly redirectUri: RedirectUri;
  private isUsed: boolean;
  private readonly createdAt: Date;
  private readonly expiresAt: Date;

  constructor(
    id: string,
    clientId: string,
    userId: string,
    codeHash: CodeHash,
    scopes: CodeScopes,
    redirectUri: RedirectUri,
    isUsed: boolean,
    createdAt: Date,
    expiresAt: Date
  ) {
    this.id = id;
    this.clientId = clientId;
    this.userId = userId;
    this.codeHash = codeHash;
    this.scopes = scopes;
    this.redirectUri = redirectUri;
    this.isUsed = isUsed;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
  }

  static create(params: {
    clientId: string;
    userId: string;
    codeHash: CodeHash;
    scopes: CodeScopes;
    redirectUri: RedirectUri;
    expiresAt: Date;
  }): AuthorizationCode {
    return new AuthorizationCode(
      randomUUID(),
      params.clientId,
      params.userId,
      params.codeHash,
      params.scopes,
      params.redirectUri,
      false,
      new Date(),
      params.expiresAt
    );
  }

  getId(): string {
    return this.id;
  }

  getClientId(): string {
    return this.clientId;
  }

  getUserId(): string {
    return this.userId;
  }

  getCodeHash(): CodeHash {
    return this.codeHash;
  }

  getScopes(): CodeScopes {
    return this.scopes;
  }

  getRedirectUri(): RedirectUri {
    return this.redirectUri;
  }

  getIsUsed(): boolean {
    return this.isUsed;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getExpiresAt(): Date {
    return new Date(this.expiresAt);
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt.getTime() <= now.getTime();
  }

  markUsed(): void {
    if (this.isUsed) {
      throw new AuthorizationCodeAlreadyUsedException();
    }

    this.isUsed = true;
  }
}
