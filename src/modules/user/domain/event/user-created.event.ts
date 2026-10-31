import type { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import type { Email } from "@modules/user/domain/value-object/email.value-object";
import type { Name } from "@modules/user/domain/value-object/name.value-object";
import type { UserId } from "@modules/user/user.ids";

export class UserCreatedEvent {
  constructor(
    public readonly userId: UserId,
    public readonly email: Email,
    public readonly name: Name,
    public readonly emailConfirmedStatus: UserEmailConfirmedStatus
  ) {}
}
