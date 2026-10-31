import { testHandler } from "@shared/testing/handler-test.spec-support";

import { DeleteRoleCommand } from "@modules/user/application/command/delete-role.command";
import { DeleteRoleCommandHandler } from "@modules/user/application/handler/delete-role.command.handler";
import { makeRole, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { RoleId } from "@modules/user/user.ids";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

describe("DeleteRoleCommandHandler", () => {
  let handler: DeleteRoleCommandHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let item: ReturnType<typeof makeRole>;

  beforeEach(async () => {
    repositories = userRepositories();
    item = makeRole();
    repositories.roleRepository.findById.mockResolvedValue(item);
    handler = await testHandler(DeleteRoleCommandHandler, [
      { provide: ROLE_REPOSITORY, useValue: repositories.roleRepository },
    ]);
  });

  it("deletes the requested entity", async () => {
    const result = await handler.execute(new DeleteRoleCommand(item.getId().getValue()));
    expect(repositories.roleRepository.findById).toHaveBeenCalledWith(RoleId.from(item.getId().getValue()));
    expect(result).toBeUndefined();
    expect(repositories.roleRepository.delete).toHaveBeenCalledWith(item.getId());
  });

  it("rejects a missing entity without writing", async () => {
    repositories.roleRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new DeleteRoleCommand(item.getId().getValue()))).rejects.toThrow(
      RoleNotFoundException
    );
    expect(repositories.roleRepository.delete).not.toHaveBeenCalled();
  });

  it("propagates repository failures", async () => {
    const error = new Error("lookup failed");
    repositories.roleRepository.findById.mockRejectedValue(error);
    await expect(handler.execute(new DeleteRoleCommand(item.getId().getValue()))).rejects.toBe(error);
    expect(repositories.roleRepository.delete).not.toHaveBeenCalled();
  });
});
