import { Role } from "@modules/user/domain/entity/role";
import { RoleName } from "@modules/user/domain/value-object/role-name.value-object";

describe("Role", () => {
  it("renames without changing identity or creation time and ignores an equivalent name", () => {
    const role = Role.create({ name: new RoleName("reader") });
    const id = role.getId();
    const createdAt = role.getCreatedAt();
    role.rename(new RoleName("editor"));

    const name = role.getName();
    role.rename(new RoleName(" editor "));
    expect(role.getName()).toBe(name);
    expect(name.getValue()).toBe("editor");
    expect(role.getId()).toBe(id);
    role.getCreatedAt().setFullYear(2000);
    expect(role.getCreatedAt()).toEqual(createdAt);
  });
});
