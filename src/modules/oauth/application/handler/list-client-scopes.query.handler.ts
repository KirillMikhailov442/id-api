import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import { ListClientScopesQuery } from "@modules/oauth/application/query/list-client-scopes.query";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

@QueryHandler(ListClientScopesQuery)
@Injectable()
export class ListClientScopesQueryHandler implements IQueryHandler<ListClientScopesQuery> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: IClientRepository,
    @Inject(CLIENT_SCOPE_REPOSITORY) private readonly clientScopeRepository: IClientScopeRepository,
    @Inject(SCOPE_REPOSITORY) private readonly scopeRepository: IScopeRepository
  ) {}

  async execute(query: ListClientScopesQuery): Promise<Scope[]> {
    const client = await this.clientRepository.findById(query.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    assertClientAccess(client, query.requester);

    const assignments = await this.clientScopeRepository.findByClientId(client.getId());
    const scopeIds = assignments.map((assignment) => assignment.getScopeId());

    return this.scopeRepository.findByIds(scopeIds);
  }
}
