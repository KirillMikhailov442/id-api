import type { AuthorizationCodeId, ClientId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export class AuthorizationCodeRedeemedEvent {
  constructor(
    public readonly codeId: AuthorizationCodeId,
    public readonly clientId: ClientId,
    public readonly userId: UserId
  ) {}
}
