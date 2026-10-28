import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { CreateClientCommand } from "@modules/oauth/application/command/create-client.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import { Client } from "@modules/oauth/domain/entity/client";
import { ClientCreatedEvent } from "@modules/oauth/domain/event/client-created.event";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { ClientSecret } from "@modules/oauth/domain/value-object/client-secret.value-object";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";
import { PASSWORD_HASHER, type IPasswordHasher } from "@modules/user/user.module";

@CommandHandler(CreateClientCommand)
@Injectable()
export class CreateClientCommandHandler implements ICommandHandler<CreateClientCommand> {
  private readonly clientRepository: IClientRepository;
  private readonly passwordHasher: IPasswordHasher;
  private readonly eventBus: EventBus;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository,
    @Inject(PASSWORD_HASHER)
    passwordHasher: IPasswordHasher,
    @Inject(EventBus)
    eventBus: EventBus
  ) {
    this.clientRepository = clientRepository;
    this.passwordHasher = passwordHasher;
    this.eventBus = eventBus;
  }

  async execute(command: CreateClientCommand): Promise<Client> {
    const name = new ClientName(command.name);
    const secret = new ClientSecret(command.secret);
    const secretHash = await this.passwordHasher.hash(secret.getValue());
    const client = Client.create({
      userId: command.requester.userId,
      name,
      secretHash,
      location: command.location === undefined ? undefined : new LocationHref(command.location),
    });
    await this.clientRepository.save(client);
    this.eventBus.publish(new ClientCreatedEvent(client.getId(), client.getUserId(), name.getValue()));
    return client;
  }
}
