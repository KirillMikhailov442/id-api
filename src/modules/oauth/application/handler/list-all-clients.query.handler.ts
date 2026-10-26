import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import { ListAllClientsQuery } from "@modules/oauth/application/query/list-all-clients.query";
import type { Client } from "@modules/oauth/domain/entity/client";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";

@QueryHandler(ListAllClientsQuery)
@Injectable()
export class ListAllClientsQueryHandler implements IQueryHandler<ListAllClientsQuery> {
  private readonly clientRepository: IClientRepository;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository
  ) {
    this.clientRepository = clientRepository;
  }

  async execute(query: ListAllClientsQuery): Promise<{
    items: Client[];
    total: number;
  }> {
    const [items, total] = await Promise.all([
      this.clientRepository.findAll({ limit: query.limit, offset: query.offset }),
      this.clientRepository.count(),
    ]);
    return { items, total };
  }
}
