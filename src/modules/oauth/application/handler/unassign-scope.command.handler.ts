import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { assertClientAccess } from "@modules/oauth/application/client-access";
import { UnassignScopeCommand } from "@modules/oauth/application/command/unassign-scope.command";
import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ScopeNotAssignedException } from "@modules/oauth/domain/exception/scope-not-assigned.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

@CommandHandler(UnassignScopeCommand)
@Injectable()
export class UnassignScopeCommandHandler implements ICommandHandler<UnassignScopeCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clientRepository: IClientRepository,
    @Inject(CLIENT_SCOPE_REPOSITORY) private readonly clientScopeRepository: IClientScopeRepository,
    @Inject(SCOPE_REPOSITORY) private readonly scopeRepository: IScopeRepository
  ) {}

  async execute(command: UnassignScopeCommand): Promise<void> {
    const client = await this.clientRepository.findById(command.clientId);

    if (client === null) {
      throw new ClientNotFoundException();
    }

    assertClientAccess(client, command.requester);

    const name = new ScopeName(command.scopeName);
    const scope = await this.scopeRepository.findByName(name);

    if (scope === null) {
      throw new ScopeNotFoundException(`Scope "${name.getValue()}" not found`);
    }

    if (!(await this.clientScopeRepository.exists(client.getId(), scope.getId()))) {
      throw new ScopeNotAssignedException();
    }

    await this.clientScopeRepository.delete(client.getId(), scope.getId());
  }
}
