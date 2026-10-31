import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";

import { UserBlockedEvent } from "@modules/user/domain/event/user-blocked.event";
import { UserMailService } from "@modules/user/infrastructure/mail/user-mail.service";

@EventsHandler(UserBlockedEvent)
@Injectable()
export class UserBlockedEventHandler implements IEventHandler<UserBlockedEvent> {
  private readonly logger = new Logger(UserBlockedEventHandler.name);

  constructor(
    @Inject(UserMailService)
    private readonly mailService: UserMailService
  ) {}

  async handle(event: UserBlockedEvent): Promise<void> {
    const email = event.email.getValue();

    try {
      await this.mailService.sendAccountBlockedEmail(email, {
        email,
        blockedAt: event.blockedAt,
        reason: event.reason,
      });
    } catch (error) {
      this.logger.error(`Failed to send blocked account email to ${email}: ${(error as Error).message}`);
    }
  }
}
