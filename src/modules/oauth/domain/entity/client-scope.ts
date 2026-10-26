export class ClientScope {
  private readonly clientId: string;
  private readonly scopeId: string;
  private readonly assignedAt: Date;

  constructor(clientId: string, scopeId: string, assignedAt: Date) {
    this.clientId = clientId;
    this.scopeId = scopeId;
    this.assignedAt = assignedAt;
  }

  getClientId(): string {
    return this.clientId;
  }

  getScopeId(): string {
    return this.scopeId;
  }

  getAssignedAt(): Date {
    return new Date(this.assignedAt);
  }
}
