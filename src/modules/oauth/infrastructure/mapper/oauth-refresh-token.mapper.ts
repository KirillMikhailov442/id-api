import type { OAuthRefreshToken } from "@modules/oauth/domain/entity/oauth-grant";
import { DbOAuthRefreshToken } from "@modules/oauth/infrastructure/entity/db-oauth-refresh-token.entity";
import { OAuthGrantId, OAuthRefreshTokenId } from "@modules/oauth/oauth.ids";

export class OAuthRefreshTokenMapper {
  static toDomain(token: DbOAuthRefreshToken): OAuthRefreshToken {
    return {
      ...token,
      id: OAuthRefreshTokenId.from(token.id),
      grantId: OAuthGrantId.from(token.grantId),
    };
  }

  static toPersistence(token: OAuthRefreshToken): DbOAuthRefreshToken {
    return Object.assign(new DbOAuthRefreshToken(), {
      ...token,
      id: token.id.getValue(),
      grantId: token.grantId.getValue(),
    });
  }
}
