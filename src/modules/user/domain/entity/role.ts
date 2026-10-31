import type { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import { RoleId } from "@modules/user/user.ids";

export class Role {
  constructor(
    private readonly id: RoleId,
    private name: RoleName,
    private readonly createdAt: Date
  ) {}

  static create(params: { name: RoleName }): Role {
    return new Role(RoleId.create(), params.name, new Date());
  }

  getId(): RoleId {
    return this.id;
  }

  getName(): RoleName {
    return this.name;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  rename(name: RoleName): void {
    if (name.getValue() !== this.name.getValue()) {
      this.name = name;
    }
  }
}
