import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";
import { ClientId, ScopeId } from "@modules/oauth/oauth.ids";

export class ClientScopeMapper {
  static toDomain(dbClientScope: DbClientScope): ClientScope {
    return new ClientScope(
      ClientId.from(dbClientScope.clientId),
      ScopeId.from(dbClientScope.scopeId),
      dbClientScope.assignedAt
    );
  }

  static toPersistence(clientScope: ClientScope): DbClientScope {
    const dbClientScope = new DbClientScope();

    dbClientScope.clientId = clientScope.getClientId().getValue();
    dbClientScope.scopeId = clientScope.getScopeId().getValue();
    dbClientScope.assignedAt = clientScope.getAssignedAt();

    return dbClientScope;
  }
}
