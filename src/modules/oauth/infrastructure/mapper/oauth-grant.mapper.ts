import type { OAuthGrant } from "@modules/oauth/domain/entity/oauth-grant";
import { DbOAuthGrant } from "@modules/oauth/infrastructure/entity/db-oauth-grant.entity";
import { ClientId, OAuthGrantId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

export class OAuthGrantMapper {
  static toDomain(grant: DbOAuthGrant): OAuthGrant {
    return {
      ...grant,
      id: OAuthGrantId.from(grant.id),
      userId: UserId.from(grant.userId),
      clientId: ClientId.from(grant.clientId),
    };
  }

  static toPersistence(grant: OAuthGrant): DbOAuthGrant {
    return Object.assign(new DbOAuthGrant(), {
      ...grant,
      id: grant.id.getValue(),
      userId: grant.userId.getValue(),
      clientId: grant.clientId.getValue(),
    });
  }
}
