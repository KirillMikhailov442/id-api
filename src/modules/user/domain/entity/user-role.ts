import type { RoleName } from "@modules/user/domain/value-object/role-name.value-object";
import type { RoleId, UserId } from "@modules/user/user.ids";

export class UserRole {
  constructor(
    private readonly userId: UserId,
    private readonly roleId: RoleId,
    private readonly roleName: RoleName,
    private readonly appointedAt: Date = new Date()
  ) {}

  getUserId(): UserId {
    return this.userId;
  }

  getRoleId(): RoleId {
    return this.roleId;
  }

  getAppointedAt(): Date {
    return new Date(this.appointedAt);
  }

  getRoleName(): RoleName {
    return this.roleName;
  }
}
