import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";

import { UserBlockedEvent } from "@core/domain/event/user-blocked.event";
import { MailService } from "@core/infrastructure/mail/mail.service";

@EventsHandler(UserBlockedEvent)
@Injectable()
export class UserBlockedEventHandler implements IEventHandler<UserBlockedEvent> {
  private readonly logger = new Logger(UserBlockedEventHandler.name);

  constructor(@Inject(MailService) private readonly mailService: MailService) {}

  async handle(event: UserBlockedEvent): Promise<void> {
    try {
      await this.mailService.sendAccountBlockedEmail(event.email, {
        email: event.email,
        blockedAt: event.blockedAt,
        reason: event.reason,
      });
    } catch (error) {
      this.logger.error(`Failed to send blocked account email to ${event.email}: ${(error as Error).message}`);
    }
  }
}
