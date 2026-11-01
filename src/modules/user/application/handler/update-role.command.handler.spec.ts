import { testHandler } from "@shared/testing/handler-test.spec-support";

import { UpdateRoleCommand } from "@modules/user/application/command/update-role.command";
import { UpdateRoleCommandHandler } from "@modules/user/application/handler/update-role.command.handler";
import { makeRole, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { ProtectedRoleException } from "@modules/user/domain/exception/protected-role.exception";
import { RoleAlreadyExistsException } from "@modules/user/domain/exception/role-already-exists.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

describe("UpdateRoleCommandHandler", () => {
  let repos: ReturnType<typeof userRepositories>;
  let handler: UpdateRoleCommandHandler;
  let role: ReturnType<typeof makeRole>;

  beforeEach(async () => {
    repos = userRepositories();
    role = makeRole("editor");
    repos.roleRepository.findById.mockResolvedValue(role);
    repos.roleRepository.findByName.mockResolvedValue(null);
    handler = await testHandler(UpdateRoleCommandHandler, [
      { provide: ROLE_REPOSITORY, useValue: repos.roleRepository },
    ]);
  });

  it("renames and saves the role", async () => {
    await expect(handler.execute(new UpdateRoleCommand(role.getId().getValue(), "reviewer"))).resolves.toBe(role);
    expect(role.getName().getValue()).toBe("reviewer");
    expect(repos.roleRepository.save).toHaveBeenCalledWith(role);
  });

  it("skips uniqueness lookup when the name is unchanged", async () => {
    await handler.execute(new UpdateRoleCommand(role.getId().getValue(), "editor"));
    expect(repos.roleRepository.findByName).not.toHaveBeenCalled();
    expect(repos.roleRepository.save).toHaveBeenCalledWith(role);
  });

  it.each([RoleType.User, RoleType.Admin, RoleType.SuperUser])(
    "rejects updates of the SUPERUSER role to %s without mutating or saving",
    async (name) => {
      role = makeRole(RoleType.SuperUser);
      repos.roleRepository.findById.mockResolvedValue(role);
      await expect(handler.execute(new UpdateRoleCommand(role.getId().getValue(), name))).rejects.toThrow(
        ProtectedRoleException
      );
      expect(role.getName().getValue()).toBe(RoleType.SuperUser);
      expect(repos.roleRepository.findByName).not.toHaveBeenCalled();
      expect(repos.roleRepository.save).not.toHaveBeenCalled();
    }
  );

  it("rejects an unknown role", async () => {
    repos.roleRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new UpdateRoleCommand(role.getId().getValue(), "reviewer"))).rejects.toThrow(
      RoleNotFoundException
    );
    expect(repos.roleRepository.save).not.toHaveBeenCalled();
  });

  it("rejects a conflicting name without mutating or saving", async () => {
    repos.roleRepository.findByName.mockResolvedValue(makeRole("reviewer"));
    await expect(handler.execute(new UpdateRoleCommand(role.getId().getValue(), "reviewer"))).rejects.toThrow(
      RoleAlreadyExistsException
    );
    expect(role.getName().getValue()).toBe("editor");
    expect(repos.roleRepository.save).not.toHaveBeenCalled();
  });
});
