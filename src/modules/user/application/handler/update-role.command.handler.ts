import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { UpdateRoleCommand } from "@modules/user/application/command/update-role.command";
import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import type { Role } from "@modules/user/domain/entity/role";
import { RoleAlreadyExistsException } from "@modules/user/domain/exception/role-already-exists.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

@CommandHandler(UpdateRoleCommand)
@Injectable()
export class UpdateRoleCommandHandler implements ICommandHandler<UpdateRoleCommand> {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository) {}

  async execute(command: UpdateRoleCommand): Promise<Role> {
    const role = await this.roleRepository.findById(command.roleId);

    if (!role) {
      throw new RoleNotFoundException();
    }

    const name = new RoleName(command.name);

    if (name.getValue() !== role.getName().getValue()) {
      const existingRole = await this.roleRepository.findByName(name);

      if (existingRole) {
        throw new RoleAlreadyExistsException();
      }
    }

    role.rename(name);

    await this.roleRepository.save(role);

    return role;
  }
}
