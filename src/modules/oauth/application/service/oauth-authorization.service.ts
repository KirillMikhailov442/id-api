import { ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { OAuthAuthContext } from "@shared/auth/contract/auth-context";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";

import {
  OAUTH_ACCESS_TOKEN_SERVICE,
  type IOAuthAccessTokenService,
} from "@modules/oauth/application/port/oauth-access-token-service";
import { OAUTH_GRANT_STORE, type IOAuthGrantStore } from "@modules/oauth/application/port/oauth-grant-store";
import {
  OAUTH_REVOCATION_STORE,
  type IOAuthRevocationStore,
} from "@modules/oauth/application/port/oauth-revocation-store";
import { OAuthPermissionsService } from "@modules/oauth/application/service/oauth-permissions.service";
import { ClientId, OAuthGrantId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

@Injectable()
export class OAuthAuthorizationService {
  constructor(
    @Inject(OAUTH_ACCESS_TOKEN_SERVICE) private readonly accessTokens: IOAuthAccessTokenService,
    @Inject(OAUTH_GRANT_STORE) private readonly store: IOAuthGrantStore,
    @Inject(OAUTH_REVOCATION_STORE) private readonly revocations: IOAuthRevocationStore,
    @Inject(OAuthPermissionsService) private readonly permissions: OAuthPermissionsService,
    @Inject(ConfigService) private readonly config: ConfigService
  ) {}

  async authorize(rawToken: string, requiredScopes: string[]): Promise<OAuthAuthContext> {
    const claims = await this.accessTokens.verify(rawToken);

    if (await this.revocations.isRevoked(OAuthGrantId.from(claims.grantId)))
      throw new UnauthorizedException("OAuth grant revoked");

    const grant = await this.store.findGrant(OAuthGrantId.from(claims.grantId));

    if (
      grant === null ||
      grant.revokedAt !== null ||
      grant.expiresAt.getTime() <= Date.now() ||
      !grant.userId.equals(UserId.from(claims.userId)) ||
      !grant.clientId.equals(ClientId.from(claims.clientId)) ||
      grant.audience !== this.config.getOrThrow<string>("OAUTH_AUDIENCE")
    ) {
      throw new UnauthorizedException("OAuth grant is no longer active");
    }

    await this.permissions.assertCurrentPermissions(grant);

    if (
      !claims.scopes.every((scope) => grant.scopes.includes(scope)) ||
      !requiredScopes.every((scope) => claims.scopes.includes(scope) && grant.scopes.includes(scope))
    ) {
      throw new ForbiddenException("Insufficient OAuth scope");
    }

    return { ...claims, type: AccessTokenType.OAuth };
  }
}
