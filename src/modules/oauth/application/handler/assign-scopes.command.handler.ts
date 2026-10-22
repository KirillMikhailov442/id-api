import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import { AssignScopesCommand } from "@modules/oauth/application/command/assign-scopes.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import type { IClientsTransaction } from "@modules/oauth/application/port/transaction.port";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import type { Scope } from "@modules/oauth/domain/entity/scope";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import {
  CLIENT_REPOSITORY,
  CLIENT_SCOPE_REPOSITORY,
  CLIENTS_TRANSACTION,
  SCOPE_REPOSITORY,
} from "@modules/oauth/oauth.tokens";

@CommandHandler(AssignScopesCommand)
@Injectable()
export class AssignScopesCommandHandler implements ICommandHandler<AssignScopesCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: IClientRepository,
    @Inject(CLIENT_SCOPE_REPOSITORY) private readonly clientScopeRepository: IClientScopeRepository,
    @Inject(SCOPE_REPOSITORY) private readonly scopeRepository: IScopeRepository,
    @Inject(CLIENTS_TRANSACTION) private readonly transaction: IClientsTransaction
  ) {}

  async execute(command: AssignScopesCommand): Promise<Scope[]> {
    const client = await this.clientRepository.findById(command.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    assertClientAccess(client, command.requester);

    const uniqueNames = [...new Set(command.scopeNames)];
    const scopes: Scope[] = [];

    for (const scopeName of uniqueNames) {
      const name = new ScopeName(scopeName);
      const scope = await this.scopeRepository.findByName(name);

      if (scope === null) {
        throw new ScopeNotFoundException(`Scope "${name.getValue()}" not found`);
      }

      scopes.push(scope);
    }

    const assigned = await this.clientScopeRepository.findByClientId(client.getId());
    const targetScopeIds = new Set(scopes.map((scope) => scope.getId()));
    const assignedScopeIds = new Set(assigned.map((assignment) => assignment.getScopeId()));
    const toAssign = scopes.filter((scope) => !assignedScopeIds.has(scope.getId()));
    const toUnassign = assigned.filter((assignment) => !targetScopeIds.has(assignment.getScopeId()));

    await this.transaction.run(async (context) => {
      for (const scope of toAssign) {
        await context.clientScopeRepository.save(new ClientScope(client.getId(), scope.getId(), new Date()));
      }

      for (const assignment of toUnassign) {
        await context.clientScopeRepository.delete(assignment.getClientId(), assignment.getScopeId());
      }
    });

    return scopes;
  }
}
