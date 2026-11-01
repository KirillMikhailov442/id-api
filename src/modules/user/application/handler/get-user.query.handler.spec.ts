import { testHandler } from "@shared/testing/handler-test.spec-support";

import { GetUserQueryHandler } from "@modules/user/application/handler/get-user.query.handler";
import {
  makeRole,
  makeUser,
  userRepositories,
  withUserRoles,
} from "@modules/user/application/handler/user-test.spec-support";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserId } from "@modules/user/user.ids";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("GetUserQueryHandler", () => {
  let handler: GetUserQueryHandler;
  let repositories: ReturnType<typeof userRepositories>;
  let item: ReturnType<typeof makeUser>;

  beforeEach(async () => {
    repositories = userRepositories();
    item = makeUser();
    repositories.userRepository.findById.mockResolvedValue(item);
    handler = await testHandler(GetUserQueryHandler, [
      { provide: USER_REPOSITORY, useValue: repositories.userRepository },
    ]);
  });

  it("returns the requested entity", async () => {
    const result = await handler.execute(new GetUserQuery(item.getId().getValue()));
    expect(repositories.userRepository.findById).toHaveBeenCalledWith(UserId.from(item.getId().getValue()));
    expect(result).toBe(item);
  });

  it("rejects a missing entity without writing", async () => {
    repositories.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new GetUserQuery(item.getId().getValue()))).rejects.toThrow(UserNotFoundException);
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });

  it.each([[], [RoleType.User], [RoleType.Admin], ["superuser"]])(
    "hides a superuser from requester roles %j",
    async (...requesterRoles: string[]) => {
      item.assignRole(makeRole(RoleType.User));
      item.assignRole(makeRole(RoleType.Admin));
      item = withUserRoles(item, [makeRole(RoleType.SuperUser)]);
      repositories.userRepository.findById.mockResolvedValue(item);
      await expect(handler.execute(new GetUserQuery(item.getId().getValue(), requesterRoles))).rejects.toThrow(
        UserNotFoundException
      );
    }
  );

  it("allows a superuser to retrieve another superuser", async () => {
    item = withUserRoles(item, [makeRole(RoleType.SuperUser)]);
    repositories.userRepository.findById.mockResolvedValue(item);
    await expect(handler.execute(new GetUserQuery(item.getId().getValue(), [RoleType.SuperUser]))).resolves.toBe(item);
  });

  it("propagates repository failures", async () => {
    const error = new Error("lookup failed");
    repositories.userRepository.findById.mockRejectedValue(error);
    await expect(handler.execute(new GetUserQuery(item.getId().getValue()))).rejects.toBe(error);
    expect(repositories.userRepository.delete).not.toHaveBeenCalled();
  });
});
