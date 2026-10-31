import { testHandler } from "@shared/testing/handler-test.spec-support";

import { GetRoleQueryHandler } from "@modules/user/application/handler/get-role.query.handler";
import { makeRole, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { GetRoleQuery } from "@modules/user/application/query/get-role.query";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { RoleId } from "@modules/user/user.ids";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

describe("GetRoleQueryHandler", () => {
  let handler: GetRoleQueryHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let item: ReturnType<typeof makeRole>;

  beforeEach(async () => {
    repositories = userRepositories();
    item = makeRole();
    repositories.roleRepository.findById.mockResolvedValue(item);
    handler = await testHandler(GetRoleQueryHandler, [
      { provide: ROLE_REPOSITORY, useValue: repositories.roleRepository },
    ]);
  });

  it("returns the requested entity", async () => {
    const result = await handler.execute(new GetRoleQuery(item.getId().getValue()));
    expect(repositories.roleRepository.findById).toHaveBeenCalledWith(RoleId.from(item.getId().getValue()));
    expect(result).toBe(item);
  });

  it("rejects a missing entity without writing", async () => {
    repositories.roleRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new GetRoleQuery(item.getId().getValue()))).rejects.toThrow(RoleNotFoundException);
    expect(repositories.roleRepository.delete).not.toHaveBeenCalled();
  });

  it("propagates repository failures", async () => {
    const error = new Error("lookup failed");
    repositories.roleRepository.findById.mockRejectedValue(error);
    await expect(handler.execute(new GetRoleQuery(item.getId().getValue()))).rejects.toBe(error);
    expect(repositories.roleRepository.delete).not.toHaveBeenCalled();
  });
});
