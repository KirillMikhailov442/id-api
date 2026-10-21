import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { CreateRoleCommand } from "@core/application/command/create-role.command";
import type { IRoleRepository } from "@core/application/port/role-repository";
import { ROLE_REPOSITORY } from "@core/core.tokens";
import { Role } from "@core/domain/entity/role";
import { RoleAlreadyExistsException } from "@core/domain/exception/role-already-exists.exception";
import { RoleName } from "@core/domain/value-object/role-name.value-object";

@CommandHandler(CreateRoleCommand)
@Injectable()
export class CreateRoleCommandHandler implements ICommandHandler<CreateRoleCommand> {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository) {}

  async execute(command: CreateRoleCommand): Promise<Role> {
    const name = new RoleName(command.name);

    if (await this.roleRepository.findByName(name)) {
      throw new RoleAlreadyExistsException();
    }

    const role = Role.create({ name });

    await this.roleRepository.save(role);

    return role;
  }
}
