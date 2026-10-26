import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { CreateRoleCommand } from "@modules/user/application/command/create-role.command";
import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import { Role } from "@modules/user/domain/entity/role";
import { RoleAlreadyExistsException } from "@modules/user/domain/exception/role-already-exists.exception";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

@CommandHandler(CreateRoleCommand)
@Injectable()
export class CreateRoleCommandHandler implements ICommandHandler<CreateRoleCommand> {
  private readonly roleRepository: IRoleRepository;

  constructor(
    @Inject(ROLE_REPOSITORY)
    roleRepository: IRoleRepository
  ) {
    this.roleRepository = roleRepository;
  }

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
