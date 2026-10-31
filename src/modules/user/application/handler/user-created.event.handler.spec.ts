import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { UserCreatedEventHandler } from "@modules/user/application/handler/user-created.event.handler";
import { makeUser } from "@modules/user/application/handler/user-test.spec-support";
import type { IEmailConfirmationTokenService } from "@modules/user/application/port/email-confirmation-token.port";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { UserCreatedEvent } from "@modules/user/domain/event/user-created.event";
import { UserMailService } from "@modules/user/infrastructure/mail/user-mail.service";
import { EMAIL_CONFIRMATION_TOKEN_SERVICE } from "@modules/user/user.tokens";

describe("UserCreatedEventHandler", () => {
  const issue = mockFn<IEmailConfirmationTokenService["issue"]>();
  const sendConfirmationEmail = mockFn<UserMailService["sendConfirmationEmail"]>();
  const sendWelcomeEmail = mockFn<UserMailService["sendWelcomeEmail"]>();
  let handler: UserCreatedEventHandler;
  let event: UserCreatedEvent;

  beforeEach(async () => {
    issue.mockReset();
    sendConfirmationEmail.mockReset();
    sendWelcomeEmail.mockReset();
    issue.mockResolvedValue("token+/=?");

    const user = makeUser();
    event = new UserCreatedEvent(user.getId(), user.getEmail(), user.getName(), UserEmailConfirmedStatus.Unconfirmed);
    handler = await testHandler(UserCreatedEventHandler, [
      { provide: EMAIL_CONFIRMATION_TOKEN_SERVICE, useValue: { issue } },
      { provide: UserMailService, useValue: { sendConfirmationEmail, sendWelcomeEmail } },
      {
        provide: ConfigService,
        useValue: new ConfigService({
          APP_BASE_URL: "https://api.example.com///",
          APP_WEB_URL: "https://app.example.com///",
        }),
      },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends an encoded confirmation URL and welcome URL without trailing slashes", async () => {
    await handler.handle(event);
    expect(issue).toHaveBeenCalledWith({ userId: event.userId.getValue(), email: "ivan@example.com" });
    expect(sendConfirmationEmail).toHaveBeenCalledWith("ivan@example.com", {
      name: "Ivan",
      confirmUrl: "https://api.example.com/api/v1/users/confirm-email?token=token%2B%2F%3D%3F",
    });
    expect(sendWelcomeEmail).toHaveBeenCalledWith("ivan@example.com", {
      name: "Ivan",
      loginUrl: "https://app.example.com",
    });
  });

  it("sends only a welcome email for confirmed accounts", async () => {
    await handler.handle(
      new UserCreatedEvent(event.userId, event.email, event.name, UserEmailConfirmedStatus.Confirmed)
    );
    expect(issue).not.toHaveBeenCalled();
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("continues to welcome the user if token issuance fails", async () => {
    const log = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    issue.mockRejectedValue(new Error("token failed"));
    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("token failed"));
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("continues to welcome the user if confirmation mail fails", async () => {
    const log = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    sendConfirmationEmail.mockRejectedValue(new Error("confirmation failed"));
    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("confirmation failed"));
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  it("logs welcome failures without rejecting the event", async () => {
    const log = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    sendWelcomeEmail.mockRejectedValue(new Error("welcome failed"));
    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("welcome failed"));
  });
});
