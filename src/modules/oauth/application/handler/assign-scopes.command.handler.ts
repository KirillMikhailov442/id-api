import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { AssignScopesCommand } from "@modules/oauth/application/command/assign-scopes.command";
import { assertClientAccess } from "@modules/oauth/application/policy/client-access";
import type { IClientsTransaction } from "@modules/oauth/application/port/transaction.port";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { ClientId } from "@modules/oauth/oauth.ids";
import { CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";

@CommandHandler(AssignScopesCommand)
@Injectable()
export class AssignScopesCommandHandler implements ICommandHandler<AssignScopesCommand> {
  constructor(@Inject(CLIENTS_TRANSACTION) private readonly transaction: IClientsTransaction) {}

  async execute(command: AssignScopesCommand): Promise<Scope[]> {
    const clientId = ClientId.from(command.clientId);

    return this.transaction.run(async (context) => {
      const client = await context.clientRepository.findByIdForUpdate(clientId);

      if (client === null) {
        throw new ClientNotFoundException();
      }

      assertClientAccess(client, command.requester);

      const uniqueNames = [...new Set(command.scopeNames)];
      const scopes: Scope[] = [];

      for (const scopeName of uniqueNames) {
        const name = new ScopeName(scopeName);
        const scope = await context.scopeRepository.findByName(name);

        if (scope === null) {
          throw new ScopeNotFoundException(`Scope "${name.getValue()}" not found`);
        }

        scopes.push(scope);
      }

      const assigned = await context.clientScopeRepository.findByClientId(client.getId());
      const targetScopeIds = new Set(scopes.map((scope) => scope.getId().getValue()));
      const assignedScopeIds = new Set(assigned.map((assignment) => assignment.getScopeId().getValue()));
      const toAssign = scopes.filter((scope) => !assignedScopeIds.has(scope.getId().getValue()));
      const toUnassign = assigned.filter((assignment) => !targetScopeIds.has(assignment.getScopeId().getValue()));
      const removedScopes = await context.scopeRepository.findByIds(
        toUnassign.map((assignment) => assignment.getScopeId())
      );
      await context.oauthGrants.revokeByClientScopes(
        client.getId(),
        removedScopes.map((scope) => scope.getName().getValue()),
        new Date()
      );

      for (const scope of toAssign) {
        await context.clientScopeRepository.save(new ClientScope(client.getId(), scope.getId(), new Date()));
      }

      for (const assignment of toUnassign) {
        await context.clientScopeRepository.delete(assignment.getClientId(), assignment.getScopeId());
      }

      return scopes;
    });
  }
}
