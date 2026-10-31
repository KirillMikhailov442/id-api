import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { UnassignScopeCommand } from "@modules/oauth/application/command/unassign-scope.command";
import { assertClientAccess } from "@modules/oauth/application/policy/client-access";
import type { IClientsTransaction } from "@modules/oauth/application/port/transaction.port";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ScopeNotAssignedException } from "@modules/oauth/domain/exception/scope-not-assigned.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { ClientId } from "@modules/oauth/oauth.ids";
import { CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";

@CommandHandler(UnassignScopeCommand)
@Injectable()
export class UnassignScopeCommandHandler implements ICommandHandler<UnassignScopeCommand> {
  constructor(@Inject(CLIENTS_TRANSACTION) private readonly transaction: IClientsTransaction) {}

  async execute(command: UnassignScopeCommand): Promise<void> {
    const clientId = ClientId.from(command.clientId);

    await this.transaction.run(async (context) => {
      const client = await context.clientRepository.findByIdForUpdate(clientId);

      if (client === null) {
        throw new ClientNotFoundException();
      }

      assertClientAccess(client, command.requester);

      const name = new ScopeName(command.scopeName);
      const scope = await context.scopeRepository.findByName(name);

      if (scope === null) {
        throw new ScopeNotFoundException(`Scope "${name.getValue()}" not found`);
      }

      if (!(await context.clientScopeRepository.exists(client.getId(), scope.getId()))) {
        throw new ScopeNotAssignedException();
      }

      await context.oauthGrants.revokeByClientScopes(client.getId(), [scope.getName().getValue()], new Date());
      await context.clientScopeRepository.delete(client.getId(), scope.getId());
    });
  }
}
