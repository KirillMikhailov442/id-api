import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import { AddLocationCommand } from "@modules/oauth/application/command/add-location.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { ILocationRepository } from "@modules/oauth/application/port/location-repository.type";
import { Location } from "@modules/oauth/domain/entity/location";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { CLIENT_REPOSITORY, LOCATION_REPOSITORY } from "@modules/oauth/oauth.tokens";

@CommandHandler(AddLocationCommand)
@Injectable()
export class AddLocationCommandHandler implements ICommandHandler<AddLocationCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: IClientRepository,
    @Inject(LOCATION_REPOSITORY) private readonly locationRepository: ILocationRepository
  ) {}

  async execute(command: AddLocationCommand): Promise<Location> {
    const client = await this.clientRepository.findById(command.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    assertClientAccess(client, command.requester);

    const location = Location.create({ clientId: client.getId(), href: new LocationHref(command.href) });

    await this.locationRepository.save(location);

    return location;
  }
}
