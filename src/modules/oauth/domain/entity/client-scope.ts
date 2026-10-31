import type { ClientId, ScopeId } from "@modules/oauth/oauth.ids";

export class ClientScope {
  constructor(
    private readonly clientId: ClientId,
    private readonly scopeId: ScopeId,
    private readonly assignedAt: Date
  ) {}

  getClientId(): ClientId {
    return this.clientId;
  }

  getScopeId(): ScopeId {
    return this.scopeId;
  }

  getAssignedAt(): Date {
    return new Date(this.assignedAt);
  }
}
