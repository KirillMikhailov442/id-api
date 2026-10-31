import type { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";
import type { UserId } from "@modules/user/user.ids";

export interface IUserIdentityRepository {
  lock(provider: IdentityProvider, providerUserId: string): Promise<void>;
  findUserId(provider: IdentityProvider, providerUserId: string): Promise<UserId | null>;
  save(provider: IdentityProvider, providerUserId: string, userId: UserId): Promise<void>;
}
