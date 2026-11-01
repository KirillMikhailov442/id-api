import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { DeleteRoleCommand } from "@modules/user/application/command/delete-role.command";
import type { IRoleRepository } from "@modules/user/application/port/role-repository";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { ProtectedRoleException } from "@modules/user/domain/exception/protected-role.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { RoleId } from "@modules/user/user.ids";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

@CommandHandler(DeleteRoleCommand)
@Injectable()
export class DeleteRoleCommandHandler implements ICommandHandler<DeleteRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository
  ) {}

  async execute(command: DeleteRoleCommand): Promise<void> {
    const roleId = RoleId.from(command.roleId);

    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new RoleNotFoundException();
    }

    if (role.getName().getValue() === RoleType.SuperUser) {
      throw new ProtectedRoleException();
    }

    await this.roleRepository.delete(roleId);
  }
}
