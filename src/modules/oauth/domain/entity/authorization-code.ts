import { AuthorizationCodeAlreadyUsedException } from "@modules/oauth/domain/exception/authorization-code-already-used.exception";
import type { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import type { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import type { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { AuthorizationCodeId, type ClientId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export class AuthorizationCode {
  constructor(
    private readonly id: AuthorizationCodeId,
    private readonly clientId: ClientId,
    private readonly userId: UserId,
    private readonly codeHash: CodeHash,
    private readonly scopes: CodeScopes,
    private readonly redirectUri: RedirectUri,
    private isUsed: boolean,
    private readonly createdAt: Date,
    private readonly expiresAt: Date
  ) {}

  static create(params: {
    clientId: ClientId;
    userId: UserId;
    codeHash: CodeHash;
    scopes: CodeScopes;
    redirectUri: RedirectUri;
    expiresAt: Date;
  }): AuthorizationCode {
    return new AuthorizationCode(
      AuthorizationCodeId.create(),
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

  getId(): AuthorizationCodeId {
    return this.id;
  }

  getClientId(): ClientId {
    return this.clientId;
  }

  getUserId(): UserId {
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
