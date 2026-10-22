import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { DeleteRoleCommand } from "@modules/user/application/command/delete-role.command";
import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";

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
