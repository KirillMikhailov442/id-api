import { ConfigService } from "@nestjs/config";
import { MailService } from "@shared/mail/mail.service";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { UserMailService } from "@modules/user/infrastructure/mail/user-mail.service";

describe("UserMailService", () => {
  const sendMail = mockFn<MailService["sendMail"]>();
  let service: UserMailService;
  const blockedAt = new Date(2026, 0, 2, 15, 4);

  async function create(ttl = 3600) {
    return testHandler(UserMailService, [
      { provide: MailService, useValue: { sendMail } },
      { provide: ConfigService, useValue: new ConfigService({ EMAIL_CONFIRM_TTL: ttl }) },
    ]);
  }

  beforeEach(async () => {
    sendMail.mockReset();
    service = await create();
  });

  it.each([
    { ttl: 1, hours: 1 },
    { ttl: 3600, hours: 1 },
    { ttl: 3601, hours: 2 },
    { ttl: 86400, hours: 24 },
  ])("renders confirmation lifetime $ttl as $hours hours", async ({ ttl, hours }) => {
    service = await create(ttl);

    const confirmUrl = "https://id.example.com/confirm?token=abc&source=email";
    await service.sendConfirmationEmail("ivan@example.com", { name: "Ivan", confirmUrl });

    const message = sendMail.mock.calls[0][0];
    expect(message).toMatchObject({ to: "ivan@example.com", subject: "Подтверждение регистрации" });
    expect(message.html).toContain(`Ссылка действует ${hours} ч.`);
    expect(message.text).toContain(`Ссылка действует ${hours} ч.`);
    expect(message.text).toContain(confirmUrl);
    expect(message.html).toContain("&amp;");
    expect(message.html).not.toContain("{{");
  });

  it("renders a personalized welcome with separate HTML and plain text", async () => {
    await service.sendWelcomeEmail("ivan@example.com", {
      name: '<script>alert("x")</script>',
      loginUrl: "https://id.example.com/login?a=1&b=2",
    });

    const message = sendMail.mock.calls[0][0];
    expect(message).toMatchObject({ to: "ivan@example.com", subject: "Добро пожаловать!" });
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).not.toContain("<script>");
    expect(message.text).toContain("Добро пожаловать");
    expect(message.text).toContain("https://id.example.com/login?a=1&b=2");
    expect(message.text).not.toContain("<div");
  });

  it.each([
    { reason: undefined, expected: "Не указана" },
    { reason: "Abuse report", expected: "Abuse report" },
  ])("renders account blocking with reason $expected and a local date", async ({ reason, expected }) => {
    await service.sendAccountBlockedEmail("recipient@example.com", { email: "account@example.com", blockedAt, reason });

    const message = sendMail.mock.calls[0][0];
    expect(message).toMatchObject({ to: "recipient@example.com", subject: "Ваш аккаунт заблокирован" });

    for (const body of [message.html, message.text]) {
      expect(body).toContain("account@example.com");
      expect(body).toContain(expected);
      expect(body).toContain("02.01.2026");
      expect(body).toContain("15:04");
    }
  });

  it.each(["confirmation", "welcome", "blocked"])("propagates mail delivery failures for %s", async (kind) => {
    const error = new Error("SMTP unavailable");
    sendMail.mockRejectedValue(error);

    const result =
      kind === "confirmation"
        ? service.sendConfirmationEmail("ivan@example.com", {
            name: "Ivan",
            confirmUrl: "https://id.example.com/confirm",
          })
        : kind === "welcome"
          ? service.sendWelcomeEmail("ivan@example.com", { name: "Ivan", loginUrl: "https://id.example.com/login" })
          : service.sendAccountBlockedEmail("ivan@example.com", { email: "ivan@example.com", blockedAt });
    await expect(result).rejects.toBe(error);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
