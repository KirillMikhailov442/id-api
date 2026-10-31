import type { Email } from "@modules/user/domain/value-object/email.value-object";
import type { UserId } from "@modules/user/user.ids";

export class UserBlockedEvent {
  constructor(
    public readonly userId: UserId,
    public readonly email: Email,
    public readonly reason: string | undefined,
    public readonly blockedAt: Date
  ) {}
}
