import { Scope } from "@modules/oauth/domain/entity/scope";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { DbScope } from "@modules/oauth/infrastructure/entity/db-scope.entity";

export class ScopeMapper {
  static toDomain(dbScope: DbScope): Scope {
    return new Scope(dbScope.id, new ScopeName(dbScope.name), dbScope.createdAt);
  }

  static toPersistence(scope: Scope): DbScope {
    const dbScope = new DbScope();

    dbScope.id = scope.getId();
    dbScope.name = scope.getName().getValue();
    dbScope.createdAt = scope.getCreatedAt();

    return dbScope;
  }
}
