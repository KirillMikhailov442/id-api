import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";

import type { IEmailConfirmationTokenService } from "@modules/user/application/port/email-confirmation-token.port";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { UserMailService } from "@modules/user/infrastructure/mail/user-mail.service";
import { EMAIL_CONFIRMATION_TOKEN_SERVICE } from "@modules/user/user.tokens";

const CONFIRM_EMAIL_PATH = "/api/v1/users/confirm-email";

@EventsHandler(UserCreatedEvent)
@Injectable()
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEventHandler.name);
  private readonly emailConfirmationTokenService: IEmailConfirmationTokenService;
  private readonly mailService: UserMailService;
  private readonly configService: ConfigService;

  constructor(
    @Inject(EMAIL_CONFIRMATION_TOKEN_SERVICE)
    emailConfirmationTokenService: IEmailConfirmationTokenService,
    @Inject(UserMailService)
    mailService: UserMailService,
    @Inject(ConfigService)
    configService: ConfigService
  ) {
    this.emailConfirmationTokenService = emailConfirmationTokenService;
    this.mailService = mailService;
    this.configService = configService;
  }

  async handle(event: UserCreatedEvent): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>("APP_BASE_URL").replace(/\/+$/, "");
    try {
      const token = await this.emailConfirmationTokenService.generate({
        userId: event.userId,
        email: event.email,
      });
      const confirmUrl = `${baseUrl}${CONFIRM_EMAIL_PATH}?token=${encodeURIComponent(token)}`;
      await this.mailService.sendConfirmationEmail(event.email, { name: event.name, confirmUrl });
    } catch (error) {
      this.logger.error(`Failed to send confirmation email to ${event.email}: ${(error as Error).message}`);
    }
    try {
      const loginUrl = this.configService.getOrThrow<string>("APP_WEB_URL").replace(/\/+$/, "");
      await this.mailService.sendWelcomeEmail(event.email, { name: event.name, loginUrl });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${event.email}: ${(error as Error).message}`);
    }
  }
}
