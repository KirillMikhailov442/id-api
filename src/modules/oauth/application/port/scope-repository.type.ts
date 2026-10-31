import type { PaginationQuery } from "@shared/pagination/pagination.query";
import type { IRepository } from "@shared/repository/repository.type";

import type { Scope } from "@modules/oauth/domain/entity/scope";
import type { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import type { ScopeId } from "@modules/oauth/oauth.ids";

export interface IScopeRepository extends IRepository<Scope, ScopeId> {
  findByName(name: ScopeName): Promise<Scope | null>;
  findByIds(ids: ScopeId[]): Promise<Scope[]>;
  findAll(pagination: PaginationQuery): Promise<Scope[]>;
  count(): Promise<number>;
}
