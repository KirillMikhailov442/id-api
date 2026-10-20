import type { RoleName } from "@core/domain/value-object/role-name.value-object";

export class Role {
  constructor(
    private readonly id: string,
    private readonly name: RoleName,
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
}
