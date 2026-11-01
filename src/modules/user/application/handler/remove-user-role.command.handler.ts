import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { RemoveUserRoleCommand } from "@modules/user/application/command/remove-user-role.command";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { assertUserRoleChangeAllowed } from "@modules/user/domain/policy/user-role-access.policy";
import { RoleId, UserId } from "@modules/user/user.ids";
import { TRANSACTION } from "@modules/user/user.tokens";

@CommandHandler(RemoveUserRoleCommand)
@Injectable()
export class RemoveUserRoleCommandHandler implements ICommandHandler<RemoveUserRoleCommand> {
  constructor(@Inject(TRANSACTION) private readonly transaction: ITransaction) {}

  async execute(command: RemoveUserRoleCommand): Promise<void> {
    const userId = UserId.from(command.userId);
    const roleId = RoleId.from(command.roleId);

    await this.transaction.run(async (context) => {
      const user = await context.userRepository.findById(userId);

      if (!user) throw new UserNotFoundException();

      const role = await context.roleRepository.findById(roleId);

      if (!role) throw new RoleNotFoundException();

      assertUserRoleChangeAllowed(command.requesterRoles, "remove");

      const assignment = user.removeRole(role);
      await context.userRepository.save(user);
      await context.userRoleRepository.delete(assignment.getUserId(), assignment.getRoleId());
    });
  }
}
