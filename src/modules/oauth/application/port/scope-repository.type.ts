import type { Scope } from "@modules/oauth/domain/entity/scope";
import type { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";

import type { IRepository } from "@core/shared/domain/repository.type";
import type { PaginationQuery } from "@core/shared/presentation/query/pagination.query";

export interface IScopeRepository extends IRepository<Scope, string> {
  findByName(name: ScopeName): Promise<Scope | null>;
  findByIds(ids: string[]): Promise<Scope[]>;
  findAll(pagination: PaginationQuery): Promise<Scope[]>;
  count(): Promise<number>;
}
