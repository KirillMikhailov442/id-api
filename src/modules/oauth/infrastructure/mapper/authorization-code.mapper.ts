import { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { DbAuthorizationCode } from "@modules/oauth/infrastructure/entity/db-authorization-code.entity";

export class AuthorizationCodeMapper {
  static toDomain(dbAuthorizationCode: DbAuthorizationCode): AuthorizationCode {
    return new AuthorizationCode(
      dbAuthorizationCode.id,
      dbAuthorizationCode.clientId,
      dbAuthorizationCode.userId,
      new CodeHash(dbAuthorizationCode.codeHash),
      new CodeScopes(dbAuthorizationCode.scopes.split(" ")),
      new RedirectUri(dbAuthorizationCode.redirectUri),
      dbAuthorizationCode.isUsed,
      dbAuthorizationCode.createdAt,
      dbAuthorizationCode.expiresAt
    );
  }

  static toPersistence(authorizationCode: AuthorizationCode): DbAuthorizationCode {
    const dbAuthorizationCode = new DbAuthorizationCode();

    dbAuthorizationCode.id = authorizationCode.getId();
    dbAuthorizationCode.clientId = authorizationCode.getClientId();
    dbAuthorizationCode.userId = authorizationCode.getUserId();
    dbAuthorizationCode.codeHash = authorizationCode.getCodeHash().getValue();
    dbAuthorizationCode.scopes = authorizationCode.getScopes().getValue();
    dbAuthorizationCode.redirectUri = authorizationCode.getRedirectUri().getValue();
    dbAuthorizationCode.isUsed = authorizationCode.getIsUsed();
    dbAuthorizationCode.createdAt = authorizationCode.getCreatedAt();
    dbAuthorizationCode.expiresAt = authorizationCode.getExpiresAt();

    return dbAuthorizationCode;
  }
}
