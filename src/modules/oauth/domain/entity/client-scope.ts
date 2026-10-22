export class ClientScope {
  constructor(
    private readonly clientId: string,
    private readonly scopeId: string,
    private readonly assignedAt: Date
  ) {}

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
