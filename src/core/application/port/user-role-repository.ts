import type { Role } from "@core/domain/entity/role";
import type { UserRole } from "@core/domain/entity/user-role";

export interface IUserRoleRepository {
  save(userRole: UserRole): Promise<void>;
  existsByUserIdAndRoleId(userId: string, roleId: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Role[]>;
  delete(userId: string, roleId: string): Promise<void>;
}
