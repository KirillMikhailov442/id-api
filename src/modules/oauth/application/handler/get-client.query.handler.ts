import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/policy/client-access";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import { GetClientQuery } from "@modules/oauth/application/query/get-client.query";
import type { Client } from "@modules/oauth/domain/entity/client";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ClientId } from "@modules/oauth/oauth.ids";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";

@QueryHandler(GetClientQuery)
@Injectable()
export class GetClientQueryHandler implements IQueryHandler<GetClientQuery> {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepository: IClientRepository
  ) {}

  async execute(query: GetClientQuery): Promise<Client> {
    const clientId = ClientId.from(query.clientId);

    const client = await this.clientRepository.findById(clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    assertClientAccess(client, query.requester);

    return client;
  }
}
