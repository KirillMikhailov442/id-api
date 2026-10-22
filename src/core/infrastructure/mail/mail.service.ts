import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Handlebars, { type TemplateDelegate } from "handlebars";
import { createTransport, type Transporter } from "nodemailer";

import {
  BLOCKED_ACCOUNT_TEMPLATE,
  CONFIRMATION_TEMPLATE,
  DEFAULT_BLOCK_REASON,
  EMAIL_CONFIRM_TTL_KEY,
  LAYOUT_TEMPLATE,
  SECONDS_PER_HOUR,
  SMTP_SECURE_TRUE,
  SUBJECTS,
  TEMPLATE_EXTENSION,
  WELCOME_TEMPLATE,
} from "@core/infrastructure/mail/mail.constants";
import type {
  BlockedAccountEmailData,
  ConfirmationEmailData,
  EmailContent,
  SendMailParams,
  WelcomeEmailData,
} from "@core/infrastructure/mail/mail.types";

const TEMPLATES_DIR = join(__dirname, "templates");
const RU_DATE_TIME_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function readTemplate(name: string): string {
  return readFileSync(join(TEMPLATES_DIR, `${name}${TEMPLATE_EXTENSION}`), "utf8");
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly confirmTtlHours: number;
  private readonly layout: TemplateDelegate;
  private readonly htmlTemplates = new Map<string, TemplateDelegate>();
  private readonly textTemplates = new Map<string, TemplateDelegate>();

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.transporter = createTransport({
      host: configService.getOrThrow<string>("SMTP_HOST"),
      port: configService.getOrThrow<number>("SMTP_PORT"),
      secure: configService.get<string>("SMTP_SECURE", "false") === SMTP_SECURE_TRUE,
      auth: {
        user: configService.getOrThrow<string>("SMTP_USER"),
        pass: configService.getOrThrow<string>("SMTP_PASSWORD"),
      },
    });
    this.from = configService.getOrThrow<string>("MAIL_FROM");
    this.confirmTtlHours = Math.max(
      1,
      Math.ceil(configService.getOrThrow<number>(EMAIL_CONFIRM_TTL_KEY) / SECONDS_PER_HOUR)
    );
    this.layout = Handlebars.compile(readTemplate(LAYOUT_TEMPLATE));
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log("SMTP connection verified");
    } catch (error) {
      this.logger.warn(`SMTP connection check failed: ${(error as Error).message}`);
    }
  }

  async sendMail(params: SendMailParams): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...params });
  }

  async sendConfirmationEmail(to: string, data: ConfirmationEmailData): Promise<void> {
    await this.sendMail({
      to,
      subject: SUBJECTS.confirmation,
      ...this.render(CONFIRMATION_TEMPLATE, { ...data, ttlHours: this.confirmTtlHours }),
    });
  }

  async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<void> {
    await this.sendMail({
      to,
      subject: SUBJECTS.welcome,
      ...this.render(WELCOME_TEMPLATE, data),
    });
  }

  async sendAccountBlockedEmail(to: string, data: BlockedAccountEmailData): Promise<void> {
    await this.sendMail({
      to,
      subject: SUBJECTS.blockedAccount,
      ...this.render(BLOCKED_ACCOUNT_TEMPLATE, {
        email: data.email,
        blockedAt: RU_DATE_TIME_FORMAT.format(data.blockedAt),
        reason: data.reason ?? DEFAULT_BLOCK_REASON,
      }),
    });
  }

  private render(templateName: string, data: unknown): EmailContent {
    const html = this.layout({ content: this.getTemplate(templateName, "html")(data) });
    const text = this.getTemplate(templateName, "text")(data);

    return { html, text };
  }

  private getTemplate(templateName: string, kind: "html" | "text"): TemplateDelegate {
    const templates = kind === "html" ? this.htmlTemplates : this.textTemplates;
    const fileSuffix = kind === "html" ? "" : ".text";
    const cacheKey = `${templateName}${fileSuffix}`;

    const existing = templates.get(cacheKey);
    if (existing !== undefined) {
      return existing;
    }

    const template = Handlebars.compile(readTemplate(cacheKey));
    templates.set(cacheKey, template);

    return template;
  }
}
