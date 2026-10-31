import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListRolesQueryHandler } from "@modules/user/application/handler/list-roles.query.handler";
import { makeRole, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { ListRolesQuery } from "@modules/user/application/query/list-roles.query";
import { ROLE_REPOSITORY } from "@modules/user/user.tokens";

describe("ListRolesQueryHandler", () => {
  it.each([0, 1])("returns a list containing %s roles", async (size) => {
    const { roleRepository } = userRepositories();
    const roles = size === 0 ? [] : [makeRole()];
    roleRepository.findAll.mockResolvedValue(roles);

    const handler = await testHandler(ListRolesQueryHandler, [{ provide: ROLE_REPOSITORY, useValue: roleRepository }]);
    await expect(handler.execute(new ListRolesQuery())).resolves.toBe(roles);
    expect(roleRepository.findAll).toHaveBeenCalledWith();
  });

  it("propagates a lookup failure", async () => {
    const { roleRepository } = userRepositories();
    const error = new Error("lookup failed");
    roleRepository.findAll.mockRejectedValue(error);

    const handler = await testHandler(ListRolesQueryHandler, [{ provide: ROLE_REPOSITORY, useValue: roleRepository }]);
    await expect(handler.execute(new ListRolesQuery())).rejects.toBe(error);
  });
});
