import type { User } from "@modules/user/domain/entity/user";
import type { IdentityProvider } from "@modules/user/domain/enum/identity-provider.enum";

export class ResolveExternalUserCommand {
  constructor(
    public readonly provider: IdentityProvider,
    public readonly providerUserId: string,
    public readonly email: string,
    public readonly emailConfirmed: boolean,
    public readonly name: string,
    public readonly surname: string
  ) {}
}

export type ResolveExternalUserResult = User;
