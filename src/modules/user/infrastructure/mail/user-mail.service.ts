import { join } from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "@shared/infrastructure/mail/mail.service";
import { TemplateRenderer } from "@shared/infrastructure/mail/template-renderer";

import {
  BLOCKED_ACCOUNT_TEMPLATE,
  CONFIRMATION_TEMPLATE,
  DEFAULT_BLOCK_REASON,
  EMAIL_CONFIRM_TTL_KEY,
  RU_DATE_TIME_FORMAT,
  SECONDS_PER_HOUR,
  SUBJECTS,
  WELCOME_TEMPLATE,
} from "@modules/user/infrastructure/mail/user-mail.constants";
import type {
  BlockedAccountEmailData,
  ConfirmationEmailData,
  WelcomeEmailData,
} from "@modules/user/infrastructure/mail/user-mail.types";

const TEMPLATES_DIR = join(__dirname, "templates");

@Injectable()
export class UserMailService {
  private readonly renderer = new TemplateRenderer(TEMPLATES_DIR);
  private readonly confirmTtlHours: number;
  private readonly mailService: MailService;

  constructor(
    @Inject(MailService)
    mailService: MailService,
    @Inject(ConfigService)
    configService: ConfigService
  ) {
    this.mailService = mailService;
    this.confirmTtlHours = Math.max(
      1,
      Math.ceil(configService.getOrThrow<number>(EMAIL_CONFIRM_TTL_KEY) / SECONDS_PER_HOUR)
    );
  }

  async sendConfirmationEmail(to: string, data: ConfirmationEmailData): Promise<void> {
    await this.mailService.sendMail({
      to,
      subject: SUBJECTS.confirmation,
      ...this.renderer.render(CONFIRMATION_TEMPLATE, { ...data, ttlHours: this.confirmTtlHours }),
    });
  }

  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<void> {
    await this.mailService.sendMail({
      to,
      subject: SUBJECTS.welcome,
      ...this.renderer.render(WELCOME_TEMPLATE, data),
    });
  }

  async sendAccountBlockedEmail(to: string, data: BlockedAccountEmailData): Promise<void> {
    await this.mailService.sendMail({
      to,
      subject: SUBJECTS.blockedAccount,
      ...this.renderer.render(BLOCKED_ACCOUNT_TEMPLATE, {
        email: data.email,
        blockedAt: RU_DATE_TIME_FORMAT.format(data.blockedAt),
        reason: data.reason ?? DEFAULT_BLOCK_REASON,
      }),
    });
  }
}
