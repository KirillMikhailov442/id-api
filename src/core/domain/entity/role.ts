import { randomUUID } from "node:crypto";

import type { RoleName } from "@core/domain/value-object/role-name.value-object";

export class Role {
  static create(params: { name: RoleName }): Role {
    return new Role(randomUUID(), params.name, new Date());
  }

  constructor(
    private readonly id: string,
    private name: RoleName,
    private readonly createdAt: Date
  ) {}

  getId(): string {
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
