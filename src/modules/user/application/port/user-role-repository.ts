import type { Role } from "@modules/user/domain/entity/role";
import type { UserRole } from "@modules/user/domain/entity/user-role";
import type { RoleId, UserId } from "@modules/user/user.ids";

export interface IUserRoleRepository {
  save(userRole: UserRole): Promise<void>;
  existsByUserIdAndRoleId(userId: UserId, roleId: RoleId): Promise<boolean>;
  findByUserId(userId: UserId): Promise<Role[]>;
  delete(userId: UserId, roleId: RoleId): Promise<void>;
}
