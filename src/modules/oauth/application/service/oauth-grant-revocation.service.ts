import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { OAUTH_GRANT_STORE, type IOAuthGrantStore } from "@modules/oauth/application/port/oauth-grant-store";
import {
  OAUTH_REVOCATION_STORE,
  type IOAuthRevocationStore,
} from "@modules/oauth/application/port/oauth-revocation-store";
import { OAuthGrantId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

@Injectable()
export class OAuthGrantRevocationService {
  constructor(
    @Inject(OAUTH_GRANT_STORE) private readonly store: IOAuthGrantStore,
    @Inject(OAUTH_REVOCATION_STORE) private readonly revocations: IOAuthRevocationStore
  ) {}

  async revoke(userId: UserId, grantId: OAuthGrantId): Promise<void> {
    await this.revokeGrant(grantId, userId);
  }

  async revokeAsAdmin(grantId: OAuthGrantId): Promise<void> {
    await this.revokeGrant(grantId);
  }

  private async revokeGrant(grantId: OAuthGrantId, ownerId?: UserId): Promise<void> {
    const grant = await this.store.transaction(async (context) => {
      const grant = await context.findGrant(grantId, true);

      if (grant === null || (ownerId !== undefined && !grant.userId.equals(ownerId))) {
        throw new NotFoundException("OAuth grant not found");
      }

      await context.revokeGrant(grant.id, new Date());

      return grant;
    });
    await this.revocations.revoke(grant.id, grant.lastAccessExpiresAt);
  }
}
