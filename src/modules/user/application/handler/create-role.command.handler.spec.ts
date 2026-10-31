import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { CreateRoleCommand } from "@modules/user/application/command/create-role.command";
import { CreateRoleCommandHandler } from "@modules/user/application/handler/create-role.command.handler";
import { makeRole, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { RoleAlreadyExistsException } from "@modules/user/domain/exception/role-already-exists.exception";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

describe("CreateRoleCommandHandler", () => {
  let repos: ReturnType<typeof userRepositories>;
  let handler: CreateRoleCommandHandler;

  beforeEach(async () => {
    repos = userRepositories();
    repos.roleRepository.findByName.mockResolvedValue(null);
    handler = await testHandler(CreateRoleCommandHandler, [
      { provide: ROLE_REPOSITORY, useValue: repos.roleRepository },
    ]);
  });

  it("creates and saves a role", async () => {
    const role = await handler.execute(new CreateRoleCommand("editor"));
    expect(role.getName().getValue()).toBe("editor");
    expect(repos.roleRepository.findByName).toHaveBeenCalledWith(new RoleName("editor"));
    expect(repos.roleRepository.save).toHaveBeenCalledWith(role);
  });

  it("rejects duplicate names without saving", async () => {
    repos.roleRepository.findByName.mockResolvedValue(makeRole("editor"));
    await expect(handler.execute(new CreateRoleCommand("editor"))).rejects.toThrow(RoleAlreadyExistsException);
    expect(repos.roleRepository.save).not.toHaveBeenCalled();
  });

  it("rejects invalid names before querying", async () => {
    await expect(handler.execute(new CreateRoleCommand(""))).rejects.toThrow(InvalidValueObjectException);
    expect(repos.roleRepository.findByName).not.toHaveBeenCalled();
    expect(repos.roleRepository.save).not.toHaveBeenCalled();
  });
});
