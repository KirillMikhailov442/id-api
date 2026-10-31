import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";

import type { IEmailConfirmationTokenService } from "@modules/user/application/port/email-confirmation-token.port";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { UserMailService } from "@modules/user/infrastructure/mail/user-mail.service";
import { EMAIL_CONFIRMATION_TOKEN_SERVICE } from "@modules/user/user.tokens";

const CONFIRM_EMAIL_PATH = "/api/v1/users/confirm-email";

@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEventHandler.name);

  constructor(
    @Inject(EMAIL_CONFIRMATION_TOKEN_SERVICE)
    private readonly emailConfirmationTokenService: IEmailConfirmationTokenService,
    @Inject(UserMailService)
    private readonly mailService: UserMailService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    const email = event.email.getValue();
    const name = event.name.getValue();
    const baseUrl = this.configService.getOrThrow<string>("APP_BASE_URL").replace(/\/+$/, "");

    if (event.emailConfirmedStatus === UserEmailConfirmedStatus.Unconfirmed) {
      try {
        const token = await this.emailConfirmationTokenService.issue({
          userId: event.userId.getValue(),
          email,
        });
        const confirmUrl = `${baseUrl}${CONFIRM_EMAIL_PATH}?token=${encodeURIComponent(token)}`;
        await this.mailService.sendConfirmationEmail(email, { name, confirmUrl });
      } catch (error) {
        this.logger.error(`Failed to send confirmation email to ${email}: ${(error as Error).message}`);
      }
    }

    try {
      const loginUrl = this.configService.getOrThrow<string>("APP_WEB_URL").replace(/\/+$/, "");
      await this.mailService.sendWelcomeEmail(email, { name, loginUrl });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}: ${(error as Error).message}`);
    }
  }
}
