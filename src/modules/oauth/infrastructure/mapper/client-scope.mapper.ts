import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { DbClientScope } from "@modules/oauth/infrastructure/entity/db-client-scope.entity";

export class ClientScopeMapper {
  static toDomain(dbClientScope: DbClientScope): ClientScope {
    return new ClientScope(dbClientScope.clientId, dbClientScope.scopeId, dbClientScope.assignedAt);
  }

  static toPersistence(clientScope: ClientScope): DbClientScope {
    const dbClientScope = new DbClientScope();

    dbClientScope.clientId = clientScope.getClientId();
    dbClientScope.scopeId = clientScope.getScopeId();
    dbClientScope.assignedAt = clientScope.getAssignedAt();

    return dbClientScope;
  }
}
