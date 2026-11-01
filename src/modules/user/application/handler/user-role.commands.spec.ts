import { testHandler } from "@shared/testing/handler-test.spec-support";

import { AssignUserRoleCommand } from "@modules/user/application/command/assign-user-role.command";
import { RemoveUserRoleCommand } from "@modules/user/application/command/remove-user-role.command";
import { AssignUserRoleCommandHandler } from "@modules/user/application/handler/assign-user-role.command.handler";
import { RemoveUserRoleCommandHandler } from "@modules/user/application/handler/remove-user-role.command.handler";
import {
  makeRole,
  makeUser,
  userRepositories,
  withUserRoles,
} from "@modules/user/application/handler/user-test.spec-support";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { RoleAlreadyAssignedException } from "@modules/user/domain/exception/role-already-assigned.exception";
import { RoleNotAssignedException } from "@modules/user/domain/exception/role-not-assigned.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserRoleChangeForbiddenException } from "@modules/user/domain/exception/user-role-change-forbidden.exception";
import { TRANSACTION } from "@modules/user/user.tokens";

for (const action of ["assign", "remove"] as const) {
  describe(`${action} user role`, () => {
    let repos: ReturnType<typeof userRepositories>;
    let user: ReturnType<typeof makeUser>;
    let role: ReturnType<typeof makeRole>;
    let handler: AssignUserRoleCommandHandler | RemoveUserRoleCommandHandler;
    const command = (roles: readonly string[]) =>
      action === "assign"
        ? new AssignUserRoleCommand(user.getId().getValue(), role.getId().getValue(), roles)
        : new RemoveUserRoleCommand(user.getId().getValue(), role.getId().getValue(), roles);
    const expectNoWrites = () => {
      expect(repos.userRoleRepository.save).not.toHaveBeenCalled();
      expect(repos.userRoleRepository.delete).not.toHaveBeenCalled();
      expect(repos.userRepository.save).not.toHaveBeenCalled();
    };

    beforeEach(async () => {
      repos = userRepositories();
      user = makeUser();
      user.assignRole(makeRole(RoleType.User));
      role = makeRole(RoleType.Admin);
      if (action === "remove") user.assignRole(role);
      repos.userRepository.findById.mockResolvedValue(user);
      repos.roleRepository.findById.mockResolvedValue(role);
      handler =
        action === "assign"
          ? await testHandler(AssignUserRoleCommandHandler, [{ provide: TRANSACTION, useValue: repos.transaction }])
          : await testHandler(RemoveUserRoleCommandHandler, [{ provide: TRANSACTION, useValue: repos.transaction }]);
    });

    it("allows SUPERUSER to change ADMIN while retaining USER", async () => {
      await handler.execute(command([RoleType.SuperUser]));
      if (action === "assign") {
        const assignment = repos.userRoleRepository.save.mock.calls[0]?.[0];
        expect(assignment?.getUserId()).toEqual(user.getId());
        expect(assignment?.getRoleId()).toEqual(role.getId());
        expect(assignment?.getRoleName().getValue()).toBe(RoleType.Admin);
      } else {
        expect(repos.userRoleRepository.delete).toHaveBeenCalledWith(user.getId(), role.getId());
      }
      expect(user.getRoles().some((item) => item.getRoleName().getValue() === RoleType.User)).toBe(true);
    });

    it("allows ADMIN to promote but never demote an ADMIN", async () => {
      if (action === "assign") {
        await handler.execute(command([RoleType.Admin]));
        expect(repos.userRoleRepository.save).toHaveBeenCalledTimes(1);
      } else {
        await expect(handler.execute(command([RoleType.Admin]))).rejects.toThrow(UserRoleChangeForbiddenException);
        expectNoWrites();
      }
    });

    it.each([[], [RoleType.User], ["admin"]].map((roles) => ({ roles })))(
      "rejects unauthorized requester $roles",
      async ({ roles }) => {
        await expect(handler.execute(command(roles))).rejects.toThrow(UserRoleChangeForbiddenException);
        expectNoWrites();
      }
    );

    it.each([RoleType.User, RoleType.SuperUser, "EDITOR"])("rejects changes to role %s", async (name) => {
      role = makeRole(name);
      repos.roleRepository.findById.mockResolvedValue(role);
      await expect(handler.execute(command([RoleType.SuperUser]))).rejects.toThrow(UserRoleChangeForbiddenException);
      expectNoWrites();
    });

    it("protects the roles of a SUPERUSER target", async () => {
      user = withUserRoles(user, [makeRole(RoleType.SuperUser)]);
      repos.userRepository.findById.mockResolvedValue(user);
      await expect(handler.execute(command([RoleType.SuperUser]))).rejects.toThrow(UserRoleChangeForbiddenException);
      expectNoWrites();
    });

    it("requires the base USER role", async () => {
      user = makeUser();
      repos.userRepository.findById.mockResolvedValue(user);
      await expect(handler.execute(command([RoleType.SuperUser]))).rejects.toThrow(UserRoleChangeForbiddenException);
      expectNoWrites();
    });

    it("rejects missing users", async () => {
      repos.userRepository.findById.mockResolvedValue(null);
      await expect(handler.execute(command([RoleType.SuperUser]))).rejects.toThrow(UserNotFoundException);
      expectNoWrites();
    });

    it("rejects missing roles", async () => {
      repos.roleRepository.findById.mockResolvedValue(null);
      await expect(handler.execute(command([RoleType.SuperUser]))).rejects.toThrow(RoleNotFoundException);
      expectNoWrites();
    });

    it("rejects duplicate assignments or removal of an unassigned role", async () => {
      if (action === "assign") user.assignRole(role);
      else {
        user.removeRole(role);
      }
      await expect(handler.execute(command([RoleType.SuperUser]))).rejects.toThrow(
        action === "assign" ? RoleAlreadyAssignedException : RoleNotAssignedException
      );
      expectNoWrites();
    });

    it("propagates storage failures", async () => {
      const error = new Error("write failed");
      repos.userRoleRepository.save.mockRejectedValue(error);
      repos.userRoleRepository.delete.mockRejectedValue(error);
      await expect(handler.execute(command([RoleType.SuperUser]))).rejects.toBe(error);
    });
  });
}
