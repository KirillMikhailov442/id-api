export class UserRole {
  private readonly userId: string;
  private readonly roleId: string;
  private readonly appointedAt: Date;

  constructor(userId: string, roleId: string, appointedAt: Date = new Date()) {
    this.userId = userId;
    this.roleId = roleId;
    this.appointedAt = appointedAt;
  }

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
