import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import { UpdateClientCommand } from "@modules/oauth/application/command/update-client.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { Client } from "@modules/oauth/domain/entity/client";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";

@CommandHandler(UpdateClientCommand)
@Injectable()
export class UpdateClientCommandHandler implements ICommandHandler<UpdateClientCommand> {
  private readonly clientRepository: IClientRepository;

  constructor(
    @Inject(CLIENT_REPOSITORY)
    clientRepository: IClientRepository
  ) {
    this.clientRepository = clientRepository;
  }

  async execute(command: UpdateClientCommand): Promise<Client> {
    const client = await this.clientRepository.findById(command.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }
    assertClientAccess(client, command.requester);

    if (command.name !== undefined) {
      client.updateName(new ClientName(command.name));
    }

    if (command.isActive === true) {
      client.activate();
    }

    if (command.isActive === false) {
      client.deactivate();
    }

    await this.clientRepository.save(client);
    return client;
  }
}
