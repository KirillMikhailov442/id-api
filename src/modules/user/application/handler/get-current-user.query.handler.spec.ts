import { testHandler } from "@shared/testing/handler-test.spec-support";

import { GetCurrentUserQueryHandler } from "@modules/user/application/handler/get-current-user.query.handler";
import {
  makeRole,
  makeUser,
  userRepositories,
  withUserRoles,
} from "@modules/user/application/handler/user-test.spec-support";
import { GetCurrentUserQuery } from "@modules/user/application/query/get-current-user.query";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("GetCurrentUserQueryHandler", () => {
  let handler: GetCurrentUserQueryHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let item: ReturnType<typeof makeUser>;

  beforeEach(async () => {
    repositories = userRepositories();
    item = makeUser();
    repositories.userRepository.findById.mockResolvedValue(item);
    handler = await testHandler(GetCurrentUserQueryHandler, [
      { provide: USER_REPOSITORY, useValue: repositories.userRepository },
    ]);
  });

  it("returns the requested entity", async () => {
    const result = await handler.execute(new GetCurrentUserQuery(item.getId().getValue()));
    expect(repositories.userRepository.findById).toHaveBeenCalledWith(UserId.from(item.getId().getValue()));
    expect(result).toBe(item);
  });

  it("rejects a missing entity without writing", async () => {
    repositories.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new GetCurrentUserQuery(item.getId().getValue()))).rejects.toThrow(
      UserNotFoundException
    );
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });

  it("returns the current profile even when it has the SUPERUSER role", async () => {
    item = withUserRoles(item, [makeRole(RoleType.SuperUser)]);
    repositories.userRepository.findById.mockResolvedValue(item);
    await expect(handler.execute(new GetCurrentUserQuery(item.getId().getValue()))).resolves.toBe(item);
  });

  it("propagates repository failures", async () => {
    const error = new Error("lookup failed");
    repositories.userRepository.findById.mockRejectedValue(error);
    await expect(handler.execute(new GetCurrentUserQuery(item.getId().getValue()))).rejects.toBe(error);
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });
});
