import { Inject, Injectable } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { ILocationRepository } from "@modules/oauth/application/port/location-repository.type";
import { GetClientLocationsQuery } from "@modules/oauth/application/query/get-client-locations.query";
import type { Location } from "@modules/oauth/domain/entity/location";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { CLIENT_REPOSITORY, LOCATION_REPOSITORY } from "@modules/oauth/oauth.tokens";

@QueryHandler(GetClientLocationsQuery)
@Injectable()
export class GetClientLocationsQueryHandler implements IQueryHandler<GetClientLocationsQuery> {
  private readonly clientRepository: IClientRepository;
  private readonly locationRepository: ILocationRepository;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository,
    @Inject(LOCATION_REPOSITORY)
    locationRepository: ILocationRepository
  ) {
    this.clientRepository = clientRepository;
    this.locationRepository = locationRepository;
  }

  async execute(query: GetClientLocationsQuery): Promise<Location[]> {
    const client = await this.clientRepository.findById(query.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }
    assertClientAccess(client, query.requester);
    return this.locationRepository.findByClientId(client.getId());
  }
}
