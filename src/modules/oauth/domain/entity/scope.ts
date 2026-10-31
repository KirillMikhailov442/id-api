import type { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { ScopeId } from "@modules/oauth/oauth.ids";

export class Scope {
  constructor(
    private readonly id: ScopeId,
    private readonly name: ScopeName,
    private readonly createdAt: Date
  ) {}

  static create(params: { name: ScopeName }): Scope {
    return new Scope(ScopeId.create(), params.name, new Date());
  }

  getId(): ScopeId {
    return this.id;
  }

  getName(): ScopeName {
    return this.name;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }
}
