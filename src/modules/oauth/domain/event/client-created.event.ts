import type { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import type { ClientId } from "@modules/oauth/oauth.ids";
import type { UserId } from "@modules/user/user.ids";

export class ClientCreatedEvent {
  constructor(
    public readonly clientId: ClientId,
    public readonly userId: UserId,
    public readonly name: ClientName
  ) {}
}
