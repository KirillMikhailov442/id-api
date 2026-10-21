import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { DeleteRoleCommand } from "@core/application/command/delete-role.command";
import type { IRoleRepository } from "@core/application/port/role-repository";
import { ROLE_REPOSITORY } from "@core/core.tokens";
import { RoleNotFoundException } from "@core/domain/exception/role-not-found.exception";

@CommandHandler(DeleteRoleCommand)
@Injectable()
export class DeleteRoleCommandHandler implements ICommandHandler<DeleteRoleCommand> {
  constructor(@Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const role = await this.roleRepository.findById(command.roleId);

    if (!role) {
      throw new RoleNotFoundException();
    }

    await this.roleRepository.delete(command.roleId);
  }
}
