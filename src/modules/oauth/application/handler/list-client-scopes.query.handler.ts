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
  private readonly clientRepository: IClientRepository;
  private readonly clientScopeRepository: IClientScopeRepository;
  private readonly scopeRepository: IScopeRepository;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository,
    @Inject(CLIENT_SCOPE_REPOSITORY)
    clientScopeRepository: IClientScopeRepository,
    @Inject(SCOPE_REPOSITORY)
    scopeRepository: IScopeRepository
  ) {
    this.clientRepository = clientRepository;
    this.clientScopeRepository = clientScopeRepository;
    this.scopeRepository = scopeRepository;
  }

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
