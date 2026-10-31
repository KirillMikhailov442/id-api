import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "@shared/mail/mail.service";
import type { SendMailParams } from "@shared/mail/mail.types";
import { createTransport, type Transporter } from "nodemailer";

jest.mock("nodemailer", () => ({ createTransport: jest.fn() }));

describe("MailService", () => {
  const verify = jest.fn<Promise<true>, []>();
  const sendMail = jest.fn<Promise<unknown>, [SendMailParams & { from: string }]>();
  const transport = { verify, sendMail };
  const settings = {
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: 587,
    SMTP_USER: "test-user",
    SMTP_PASSWORD: "test-password",
    MAIL_FROM: "Identity <no-reply@example.com>",
  };
  const params = { to: "ivan@example.com", subject: "Test", html: "<p>HTML</p>", text: "Text" };

  beforeEach(() => {
    jest.replaceProperty(process, "env", {});
    verify.mockReset().mockResolvedValue(true);
    sendMail.mockReset().mockResolvedValue({});
    jest
      .mocked(createTransport)
      .mockReset()
      .mockReturnValue(transport as unknown as Transporter);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    { secure: undefined, expected: false },
    { secure: "false", expected: false },
    { secure: "true", expected: true },
  ])("configures SMTP transport with secure=$secure", ({ secure, expected }) => {
    new MailService(new ConfigService({ ...settings, ...(secure === undefined ? {} : { SMTP_SECURE: secure }) }));
    expect(createTransport).toHaveBeenCalledWith({
      host: settings.SMTP_HOST,
      port: 587,
      secure: expected,
      auth: { user: settings.SMTP_USER, pass: settings.SMTP_PASSWORD },
    });
  });

  it("verifies SMTP on initialization", async () => {
    const service = new MailService(new ConfigService(settings));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(verify).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toHaveBeenCalledWith("SMTP connection verified");
  });

  it("logs verification failures without preventing application startup", async () => {
    verify.mockRejectedValue(new Error("SMTP unavailable"));

    const service = new MailService(new ConfigService(settings));
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(Logger.prototype.warn).toHaveBeenCalledWith("SMTP connection check failed: SMTP unavailable");
  });

  it("sends both bodies from the configured sender without changing the message", async () => {
    const service = new MailService(new ConfigService(settings));
    await expect(service.sendMail(Object.freeze(params))).resolves.toBeUndefined();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({ from: settings.MAIL_FROM, ...params });
  });

  it("propagates delivery failures to the caller", async () => {
    const error = new Error("Delivery rejected");
    sendMail.mockRejectedValue(error);
    await expect(new MailService(new ConfigService(settings)).sendMail(params)).rejects.toBe(error);
  });

  it.each(["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"])("requires %s configuration", (key) => {
    const config = new ConfigService({ ...settings, [key]: undefined });
    expect(() => new MailService(config)).toThrow();
  });
});
