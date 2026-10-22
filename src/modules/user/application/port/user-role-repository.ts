import type { Role } from "@modules/user/domain/entity/role";
import type { UserRole } from "@modules/user/domain/entity/user-role";

export interface IUserRoleRepository {
  save(userRole: UserRole): Promise<void>;
  existsByUserIdAndRoleId(userId: string, roleId: string): Promise<boolean>;
  findByUserId(userId: string): Promise<Role[]>;
  delete(userId: string, roleId: string): Promise<void>;
}
