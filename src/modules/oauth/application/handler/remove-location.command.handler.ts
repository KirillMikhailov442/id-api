import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import { RemoveLocationCommand } from "@modules/oauth/application/command/remove-location.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { ILocationRepository } from "@modules/oauth/application/port/location-repository.type";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { LocationNotFoundException } from "@modules/oauth/domain/exception/location-not-found.exception";
import { CLIENT_REPOSITORY, LOCATION_REPOSITORY } from "@modules/oauth/oauth.tokens";

@CommandHandler(RemoveLocationCommand)
@Injectable()
export class RemoveLocationCommandHandler implements ICommandHandler<RemoveLocationCommand> {
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

  async execute(command: RemoveLocationCommand): Promise<void> {
    const client = await this.clientRepository.findById(command.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }
    assertClientAccess(client, command.requester);
    const location = await this.locationRepository.findById(command.locationId);

    if (location === null || location.getClientId() !== client.getId()) {
      throw new LocationNotFoundException();
    }

    await this.locationRepository.delete(location.getId());
  }
}
