import type { IRepository } from "@shared/domain/repository.type";
import type { PaginationQuery } from "@shared/presentation/query/pagination.query";

import type { Scope } from "@modules/oauth/domain/entity/scope";
import type { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";

export interface IScopeRepository extends IRepository<Scope, string> {
  findByName(name: ScopeName): Promise<Scope | null>;
  findByIds(ids: string[]): Promise<Scope[]>;
  findAll(pagination: PaginationQuery): Promise<Scope[]>;
  count(): Promise<number>;
}
