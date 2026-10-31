import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";

import { DeleteClientCommand } from "@modules/oauth/application/command/delete-client.command";
import { assertClientAccess } from "@modules/oauth/application/policy/client-access";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientsTransaction } from "@modules/oauth/application/port/transaction.port";
import type { Client } from "@modules/oauth/domain/entity/client";
import { ClientDeletedEvent } from "@modules/oauth/domain/event/client-deleted.event";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ClientId } from "@modules/oauth/oauth.ids";
import { CLIENT_REPOSITORY, CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";

@CommandHandler(DeleteClientCommand)
@Injectable()
export class DeleteClientCommandHandler implements ICommandHandler<DeleteClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private readonly clientRepository: IClientRepository,
    @Inject(CLIENTS_TRANSACTION)
    private readonly transaction: IClientsTransaction,
    @Inject(EventBus)
    private readonly eventBus: EventBus
  ) {}

  async execute(command: DeleteClientCommand): Promise<Client> {
    const clientId = ClientId.from(command.clientId);

    const client = await this.clientRepository.findById(clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    assertClientAccess(client, command.requester);
    await this.transaction.run(async (context) => {
      await context.clientScopeRepository.deleteByClientId(client.getId());
      await context.clientRepository.delete(client.getId());
    });
    this.eventBus.publish(new ClientDeletedEvent(client.getId(), client.getUserId()));

    return client;
  }
}
