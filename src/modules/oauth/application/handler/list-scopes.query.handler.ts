import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import { ListScopesQuery } from "@modules/oauth/application/query/list-scopes.query";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

@QueryHandler(ListScopesQuery)
@Injectable()
export class ListScopesQueryHandler implements IQueryHandler<ListScopesQuery> {
  constructor(
    @Inject(SCOPE_REPOSITORY)
    private readonly scopeRepository: IScopeRepository
  ) {}

  async execute(query: ListScopesQuery): Promise<{
    items: Scope[];
    total: number;
  }> {
    const [items, total] = await Promise.all([
      this.scopeRepository.findAll({ limit: query.limit, offset: query.offset }),
      this.scopeRepository.count(),
    ]);

    return { items, total };
  }
}
