import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";
import { mapOptional } from "@shared/mapping/map-optional";

import { CreateClientCommand } from "@modules/oauth/application/command/create-client.command";
import type { IClientsTransaction } from "@modules/oauth/application/port/transaction.port";
import { Client } from "@modules/oauth/domain/entity/client";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { ClientCreatedEvent } from "@modules/oauth/domain/event/client-created.event";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { ClientSecret } from "@modules/oauth/domain/value-object/client-secret.value-object";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";
import { UserId } from "@modules/user/user.ids";
import { PASSWORD_HASHER, type IPasswordHasher } from "@modules/user/user.module";

@CommandHandler(CreateClientCommand)
@Injectable()
export class CreateClientCommandHandler implements ICommandHandler<CreateClientCommand> {
  constructor(
    @Inject(CLIENTS_TRANSACTION)
    private readonly transaction: IClientsTransaction,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(EventBus)
    private readonly eventBus: EventBus
  ) {}

  async execute(command: CreateClientCommand): Promise<Client> {
    const requesterUserId = UserId.from(command.requester.userId);

    const name = new ClientName(command.name);
    const secret = new ClientSecret(command.secret);
    const secretHash = await this.passwordHasher.hash(secret.getValue());
    const location = mapOptional(command.location, (value) => new LocationHref(value));
    const client = await this.transaction.run(async (context) => {
      const scopes: Scope[] = [];

      for (const scopeName of new Set(command.scopes)) {
        const name = new ScopeName(scopeName);
        const scope = await context.scopeRepository.findByName(name);

        if (scope === null) {
          throw new ScopeNotFoundException(`Scope "${name.getValue()}" not found`);
        }

        scopes.push(scope);
      }

      const client = Client.create({
        userId: requesterUserId,
        name,
        secretHash,
        location,
        scopes,
      });
      await context.clientRepository.save(client);

      for (const scope of scopes) {
        await context.clientScopeRepository.save(new ClientScope(client.getId(), scope.getId(), new Date()));
      }

      return client;
    });
    this.eventBus.publish(new ClientCreatedEvent(client.getId(), client.getUserId(), name));

    return client;
  }
}
