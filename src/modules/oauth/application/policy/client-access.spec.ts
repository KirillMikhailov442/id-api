import { assertClientAccess, isAdmin } from "@modules/oauth/application/policy/client-access";
import { Client } from "@modules/oauth/domain/entity/client";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { UserId } from "@modules/user/user.ids";

describe("Client access policy", () => {
  const owner = UserId.from("abcdef01-2345-4678-9abc-def012345678");
  const client = Client.create({ userId: owner, name: new ClientName("Test app"), secretHash: "hash" });

  it.each([[], [RoleType.User], [RoleType.Admin]].map((roles) => ({ roles })))(
    "allows an owner with roles %p",
    ({ roles }) => {
      expect(() => assertClientAccess(client, { userId: owner.getValue().toUpperCase(), roles })).not.toThrow();
    }
  );

  it("allows administrators to access another user's client", () => {
    expect(() =>
      assertClientAccess(client, { userId: UserId.create().getValue(), roles: [RoleType.User, RoleType.Admin] })
    ).not.toThrow();
  });

  it.each([[], [RoleType.User], ["admin"], ["SUPER_ADMIN"]].map((roles) => ({ roles })))(
    "hides another user's client from roles %p",
    ({ roles }) => {
      expect(() => assertClientAccess(client, { userId: UserId.create().getValue(), roles })).toThrow(
        ClientNotFoundException
      );
    }
  );

  it.each([
    [[], false],
    [[RoleType.User], false],
    [["admin"], false],
    [["SUPER_ADMIN"], false],
    [[RoleType.Admin], true],
    [[RoleType.User, RoleType.Admin], true],
  ] as [string[], boolean][])("checks the exact administrator role in %p", (roles, expected) => {
    expect(isAdmin(roles)).toBe(expected);
  });
});
