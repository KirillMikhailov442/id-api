import { randomUUID } from "node:crypto";

import type { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";

export class Scope {
  constructor(
    private readonly id: string,
    private readonly name: ScopeName,
    private readonly createdAt: Date
  ) {}

  static create(params: { name: ScopeName }): Scope {
    return new Scope(randomUUID(), params.name, new Date());
  }

  getId(): string {
    return this.id;
  }

  getName(): ScopeName {
    return this.name;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }
}
