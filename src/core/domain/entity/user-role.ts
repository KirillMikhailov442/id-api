export class UserRole {
  constructor(
    private readonly userId: string,
    private readonly roleId: string,
    private readonly appointedAt: Date = new Date()
  ) {}

  getUserId(): string {
    return this.userId;
  }

  getRoleId(): string {
    return this.roleId;
  }

  getAppointedAt(): Date {
    return new Date(this.appointedAt);
  }
}
