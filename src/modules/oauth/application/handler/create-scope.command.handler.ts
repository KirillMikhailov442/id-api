import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { CreateScopeCommand } from "@modules/oauth/application/command/create-scope.command";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import { Scope } from "@modules/oauth/domain/entity/scope";
import { ScopeAlreadyExistsException } from "@modules/oauth/domain/exception/scope-already-exists.exception";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

@CommandHandler(CreateScopeCommand)
@Injectable()
export class CreateScopeCommandHandler implements ICommandHandler<CreateScopeCommand> {
  constructor(@Inject(SCOPE_REPOSITORY) private readonly scopeRepository: IScopeRepository) {}

  async execute(command: CreateScopeCommand): Promise<Scope> {
    const name = new ScopeName(command.name);

    if ((await this.scopeRepository.findByName(name)) !== null) {
      throw new ScopeAlreadyExistsException();
    }

    const scope = Scope.create({ name });

    await this.scopeRepository.save(scope);

    return scope;
  }
}
