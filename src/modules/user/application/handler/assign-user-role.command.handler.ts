import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { AssignUserRoleCommand } from "@modules/user/application/command/assign-user-role.command";
import type { ITransaction } from "@modules/user/application/port/transaction.port";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { assertUserRoleChangeAllowed } from "@modules/user/domain/policy/user-role-access.policy";
import { RoleId, UserId } from "@modules/user/user.ids";
import { TRANSACTION } from "@modules/user/user.tokens";

@CommandHandler(AssignUserRoleCommand)
@Injectable()
export class AssignUserRoleCommandHandler implements ICommandHandler<AssignUserRoleCommand> {
  constructor(@Inject(TRANSACTION) private readonly transaction: ITransaction) {}

  async execute(command: AssignUserRoleCommand): Promise<void> {
    const userId = UserId.from(command.userId);
    const roleId = RoleId.from(command.roleId);

    await this.transaction.run(async (context) => {
      const user = await context.userRepository.findById(userId);

      if (!user) throw new UserNotFoundException();

      const role = await context.roleRepository.findById(roleId);

      if (!role) throw new RoleNotFoundException();

      assertUserRoleChangeAllowed(command.requesterRoles, "assign");

      const assignment = user.assignRole(role);
      await context.userRepository.save(user);
      await context.userRoleRepository.save(assignment);
    });
  }
}
