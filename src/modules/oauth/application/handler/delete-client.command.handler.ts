import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import { DeleteClientCommand } from "@modules/oauth/application/command/delete-client.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientsTransaction } from "@modules/oauth/application/port/transaction.port";
import type { Client } from "@modules/oauth/domain/entity/client";
import { ClientDeletedEvent } from "@modules/oauth/domain/event/client-deleted.event";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { CLIENT_REPOSITORY, CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";

@CommandHandler(DeleteClientCommand)
@Injectable()
export class DeleteClientCommandHandler implements ICommandHandler<DeleteClientCommand> {
  private readonly clientRepository: IClientRepository;
  private readonly transaction: IClientsTransaction;
  private readonly eventBus: EventBus;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository,
    @Inject(CLIENTS_TRANSACTION)
    transaction: IClientsTransaction,
    @Inject(EventBus)
    eventBus: EventBus
  ) {
    this.clientRepository = clientRepository;
    this.transaction = transaction;
    this.eventBus = eventBus;
  }

  async execute(command: DeleteClientCommand): Promise<Client> {
    const client = await this.clientRepository.findById(command.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }
    assertClientAccess(client, command.requester);
    await this.transaction.run(async (context) => {
      await context.clientScopeRepository.deleteByClientId(client.getId());
      await context.locationRepository.deleteByClientId(client.getId());
      await context.clientRepository.delete(client.getId());
    });
    this.eventBus.publish(new ClientDeletedEvent(client.getId(), client.getUserId()));
    return client;
  }
}
