import { randomUUID } from "node:crypto";

import type { RoleName } from "@modules/user/domain/value-object/role-name.value-object";

export class Role {
  private readonly id: string;
  private name: RoleName;
  private readonly createdAt: Date;

  constructor(id: string, name: RoleName, createdAt: Date) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
  }

  static create(params: { name: RoleName }): Role {
    return new Role(randomUUID(), params.name, new Date());
  }

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
