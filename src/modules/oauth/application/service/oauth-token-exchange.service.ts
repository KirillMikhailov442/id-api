import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { RedeemCodeCommand } from "@modules/oauth/application/command/redeem-code.command";
import type { IAuthorizationCodeRepository } from "@modules/oauth/application/port/authorization-code-repository.type";
import type { IAuthorizationCodeService } from "@modules/oauth/application/port/authorization-code-service.type";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IIdTokenService } from "@modules/oauth/application/port/id-token-service.type";
import {
  OAUTH_ACCESS_TOKEN_SERVICE,
  type IOAuthAccessTokenService,
} from "@modules/oauth/application/port/oauth-access-token-service";
import {
  OAUTH_GRANT_STORE,
  type IOAuthGrantStore,
  type OAuthGrantContext,
} from "@modules/oauth/application/port/oauth-grant-store";
import {
  OAUTH_REVOCATION_STORE,
  type IOAuthRevocationStore,
} from "@modules/oauth/application/port/oauth-revocation-store";
import type { OAuthTokenResult } from "@modules/oauth/application/port/oauth-token-result.type";
import { OAuthPermissionsService } from "@modules/oauth/application/service/oauth-permissions.service";
import type { OAuthGrant } from "@modules/oauth/domain/entity/oauth-grant";
import { OAuthScope } from "@modules/oauth/domain/enum/oauth-scope.enum";
import { AuthorizationCodeAlreadyUsedException } from "@modules/oauth/domain/exception/authorization-code-already-used.exception";
import { AuthorizationCodeExpiredException } from "@modules/oauth/domain/exception/authorization-code-expired.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";
import { InvalidAuthorizationCodeException } from "@modules/oauth/domain/exception/invalid-authorization-code.exception";
import { InvalidClientCredentialsException } from "@modules/oauth/domain/exception/invalid-client-credentials.exception";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { ClientId, OAuthGrantId, OAuthRefreshTokenId } from "@modules/oauth/oauth.ids";
import {
  AUTHORIZATION_CODE_REPOSITORY,
  AUTHORIZATION_CODE_SERVICE,
  CLIENT_REPOSITORY,
  ID_TOKEN_SERVICE,
} from "@modules/oauth/oauth.tokens";
import {
  PASSWORD_HASHER,
  USER_REPOSITORY,
  type IPasswordHasher,
  type IUserRepository,
} from "@modules/user/user.module";

const hashOAuthRefreshToken = (token: string): string => createHash("sha256").update(token).digest("hex");

@Injectable()
export class OAuthTokenExchangeService {
  constructor(
    @Inject(OAUTH_GRANT_STORE)
    private readonly store: IOAuthGrantStore,
    @Inject(OAUTH_ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: IOAuthAccessTokenService,
    @Inject(OAUTH_REVOCATION_STORE)
    private readonly revocations: IOAuthRevocationStore,
    @Inject(CLIENT_REPOSITORY)
    private readonly clients: IClientRepository,
    @Inject(OAuthPermissionsService)
    private readonly permissions: OAuthPermissionsService,
    @Inject(AUTHORIZATION_CODE_REPOSITORY)
    private readonly codes: IAuthorizationCodeRepository,
    @Inject(AUTHORIZATION_CODE_SERVICE)
    private readonly codeService: IAuthorizationCodeService,
    @Inject(ID_TOKEN_SERVICE)
    private readonly idTokens: IIdTokenService,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwords: IPasswordHasher,
    @Inject(ConfigService)
    private readonly config: ConfigService
  ) {}

  async redeem(command: RedeemCodeCommand): Promise<OAuthTokenResult> {
    const clientId = ClientId.from(command.clientId);
    await this.authenticateClient(clientId, command.clientSecret);

    const candidate = await this.codes.findByCodeHash(this.codeService.hash(command.code).getValue());

    if (candidate === null || !candidate.getClientId().equals(clientId)) throw new InvalidAuthorizationCodeException();

    return this.store.transaction(async (context) => {
      await context.lockClient(clientId);

      const code = await context.lockAuthorizationCode(candidate.getId());

      if (code === null || !code.getClientId().equals(clientId)) throw new InvalidAuthorizationCodeException();

      if (code.getIsUsed()) throw new AuthorizationCodeAlreadyUsedException();

      if (code.isExpired()) throw new AuthorizationCodeExpiredException();

      if (
        command.redirectUri !== undefined &&
        new RedirectUri(command.redirectUri).getValue() !== code.getRedirectUri().getValue()
      ) {
        throw new InvalidAuthorizationCodeException();
      }

      const now = new Date();
      const grant: OAuthGrant = {
        id: OAuthGrantId.create(),
        userId: code.getUserId(),
        clientId: code.getClientId(),
        scopes: code.getScopes().getItems(),
        audience: this.config.getOrThrow<string>("OAUTH_AUDIENCE"),
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.config.getOrThrow<number>("OAUTH_REFRESH_TTL") * 1000),
        lastAccessExpiresAt: now,
        revokedAt: null,
      };
      await this.permissions.assertCurrentPermissions(grant);

      const result = await this.issue(context, grant);

      if (grant.scopes.includes(OAuthScope.OpenId)) {
        const user = await this.users.findById(grant.userId);

        if (user === null) throw new UnauthorizedException();

        result.idToken = await this.idTokens.issueIdToken({
          userId: grant.userId.getValue(),
          clientId: grant.clientId.getValue(),
          scopes: grant.scopes,
          profile: { name: user.getName().getValue(), surname: user.getSurname().getValue(), avatar: user.getAvatar() },
        });
      }

      await context.consumeAuthorizationCode(code.getId());

      return result;
    });
  }

  async refresh(clientId: ClientId, clientSecret: string, rawToken: string): Promise<OAuthTokenResult> {
    await this.authenticateClient(clientId, clientSecret);

    const hash = hashOAuthRefreshToken(rawToken);
    const candidate = await this.store.findRefreshToken(hash);

    if (candidate === null) throw new UnauthorizedException("Invalid OAuth refresh token");

    const outcome = await this.store.transaction(async (context) => {
      await context.lockClient(clientId);

      const grant = await context.findGrant(candidate.grantId, true);

      if (
        grant === null ||
        !grant.clientId.equals(clientId) ||
        grant.revokedAt !== null ||
        grant.expiresAt.getTime() <= Date.now()
      )
        return { result: null, revoked: null };

      const token = await context.findRefreshToken(hash);

      if (token === null || token.revokedAt !== null) return { result: null, revoked: null };

      if (token.usedAt !== null) {
        await context.revokeGrant(grant.id, new Date());

        return { result: null, revoked: grant };
      }

      if (token.expiresAt.getTime() <= Date.now()) return { result: null, revoked: null };

      await this.permissions.assertCurrentPermissions(grant);
      token.usedAt = new Date();
      await context.saveRefreshToken(token);

      return { result: await this.issue(context, grant), revoked: null };
    });

    if (outcome.revoked !== null)
      await this.revocations.revoke(outcome.revoked.id, outcome.revoked.lastAccessExpiresAt);

    if (outcome.result === null) throw new UnauthorizedException("Invalid OAuth refresh token");

    return outcome.result;
  }

  private async authenticateClient(id: ClientId, secret: string): Promise<void> {
    const client = await this.clients.findById(id);

    if (client === null || !(await this.passwords.compare(secret, client.getSecretHash())))
      throw new InvalidClientCredentialsException();

    if (!client.getIsActive()) throw new ClientInactiveException();
  }

  private async issue(context: OAuthGrantContext, grant: OAuthGrant): Promise<OAuthTokenResult> {
    const access = await this.accessTokens.issue({
      userId: grant.userId.getValue(),
      clientId: grant.clientId.getValue(),
      grantId: grant.id.getValue(),
      scopes: grant.scopes,
    });
    grant.lastAccessExpiresAt = new Date(Math.max(grant.lastAccessExpiresAt.getTime(), access.expiresAt.getTime()));

    const refreshToken = grant.scopes.includes(OAuthScope.OfflineAccess)
      ? randomBytes(32).toString("base64url")
      : undefined;

    if (refreshToken === undefined) grant.expiresAt = access.expiresAt;

    await context.saveGrant(grant);

    if (refreshToken !== undefined)
      await context.saveRefreshToken({
        id: OAuthRefreshTokenId.create(),
        grantId: grant.id,
        tokenHash: hashOAuthRefreshToken(refreshToken),
        createdAt: new Date(),
        expiresAt: grant.expiresAt,
        usedAt: null,
        revokedAt: null,
      });

    return {
      clientId: grant.clientId.getValue(),
      userId: grant.userId.getValue(),
      scopes: grant.scopes,
      accessToken: access.token,
      refreshToken,
      expiresIn: access.expiresIn,
    };
  }
}
