import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { CreateClientCommand } from "@modules/oauth/application/command/create-client.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { ILocationRepository } from "@modules/oauth/application/port/location-repository.type";
import type { IClientsTransaction } from "@modules/oauth/application/port/transaction.port";
import { Client } from "@modules/oauth/domain/entity/client";
import { Location } from "@modules/oauth/domain/entity/location";
import { ClientCreatedEvent } from "@modules/oauth/domain/event/client-created.event";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { ClientSecret } from "@modules/oauth/domain/value-object/client-secret.value-object";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { CLIENT_REPOSITORY, CLIENTS_TRANSACTION, LOCATION_REPOSITORY } from "@modules/oauth/oauth.tokens";
import { PASSWORD_HASHER, type IPasswordHasher } from "@modules/user/user.module";

export interface CreateClientResult {
  client: Client;
  locations: Location[];
}

@CommandHandler(CreateClientCommand)
@Injectable()
export class CreateClientCommandHandler implements ICommandHandler<CreateClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: IClientRepository,
    @Inject(LOCATION_REPOSITORY) private readonly locationRepository: ILocationRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(CLIENTS_TRANSACTION) private readonly transaction: IClientsTransaction,
    @Inject(EventBus) private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateClientCommand): Promise<CreateClientResult> {
    const name = new ClientName(command.name);
    const secret = new ClientSecret(command.secret);
    const secretHash = await this.passwordHasher.hash(secret.getValue());

    const client = Client.create({ userId: command.requester.userId, name, secretHash });
    const locations = (command.locations ?? []).map((href) =>
      Location.create({ clientId: client.getId(), href: new LocationHref(href) })
    );

    await this.transaction.run(async (context) => {
      await context.clientRepository.save(client);

      for (const location of locations) {
        await context.locationRepository.save(location);
      }
    });

    this.eventBus.publish(new ClientCreatedEvent(client.getId(), client.getUserId(), name.getValue()));

    return { client, locations };
  }
}
