import type { ClientId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export class ClientDeletedEvent {
  constructor(
    public readonly clientId: ClientId,
    public readonly userId: UserId
  ) {}
}
