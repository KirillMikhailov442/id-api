import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SMTP_SECURE_TRUE } from "@shared/infrastructure/mail/mail.constants";
import type { SendMailParams } from "@shared/infrastructure/mail/mail.types";
import { createTransport, type Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

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
}
