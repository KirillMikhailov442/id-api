import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import { ListClientsQuery } from "@modules/oauth/application/query/list-clients.query";
import type { Client } from "@modules/oauth/domain/entity/client";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";

@QueryHandler(ListClientsQuery)
@Injectable()
export class ListClientsQueryHandler implements IQueryHandler<ListClientsQuery> {
  private readonly clientRepository: IClientRepository;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository
  ) {
    this.clientRepository = clientRepository;
  }

  async execute(query: ListClientsQuery): Promise<{
    items: Client[];
    total: number;
  }> {
    const [items, total] = await Promise.all([
      this.clientRepository.findByUserId(query.requester.userId, { limit: query.limit, offset: query.offset }),
      this.clientRepository.countByUserId(query.requester.userId),
    ]);
    return { items, total };
  }
}
