import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import { ListClientsQuery } from "@modules/oauth/application/query/list-clients.query";
import type { Client } from "@modules/oauth/domain/entity/client";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";
import { UserId } from "@modules/user/user.ids";

@QueryHandler(ListClientsQuery)
@Injectable()
export class ListClientsQueryHandler implements IQueryHandler<ListClientsQuery> {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepository: IClientRepository
  ) {}

  async execute(query: ListClientsQuery): Promise<{
    items: Client[];
    total: number;
  }> {
    const requesterUserId = UserId.from(query.requester.userId);

    const [items, total] = await Promise.all([
      this.clientRepository.findByUserId(requesterUserId, { limit: query.limit, offset: query.offset }, query.search),
      this.clientRepository.countByUserId(requesterUserId, query.search),
    ]);

    return { items, total };
  }
}
