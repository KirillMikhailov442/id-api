import type { AuthorizationCodeId, ClientId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export class AuthorizationCodeIssuedEvent {
  constructor(
    public readonly codeId: AuthorizationCodeId,
    public readonly clientId: ClientId,
    public readonly userId: UserId
  ) {}
}
