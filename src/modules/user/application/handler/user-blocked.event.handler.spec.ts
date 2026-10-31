import { Logger } from "@nestjs/common";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { UserBlockedEventHandler } from "@modules/user/application/handler/user-blocked.event.handler";
import { makeUser } from "@modules/user/application/handler/user-test.spec-support";
import { UserBlockedEvent } from "@modules/user/domain/event/user-blocked.event";
import { UserMailService } from "@modules/user/infrastructure/mail/user-mail.service";

describe("UserBlockedEventHandler", () => {
  const sendAccountBlockedEmail = mockFn<UserMailService["sendAccountBlockedEmail"]>();
  let handler: UserBlockedEventHandler;

  beforeEach(async () => {
    sendAccountBlockedEmail.mockReset();
    handler = await testHandler(UserBlockedEventHandler, [
      { provide: UserMailService, useValue: { sendAccountBlockedEmail } },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(["abuse", undefined])("sends the blocking details with reason %s", async (reason) => {
    const user = makeUser();
    const blockedAt = new Date("2026-10-01T12:00:00Z");
    await handler.handle(new UserBlockedEvent(user.getId(), user.getEmail(), reason, blockedAt));
    expect(sendAccountBlockedEmail).toHaveBeenCalledWith("ivan@example.com", {
      email: "ivan@example.com",
      blockedAt,
      reason,
    });
  });

  it("logs mail failures without rejecting the event", async () => {
    const log = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    sendAccountBlockedEmail.mockRejectedValue(new Error("mail unavailable"));

    const user = makeUser();
    await expect(
      handler.handle(new UserBlockedEvent(user.getId(), user.getEmail(), undefined, new Date()))
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("mail unavailable"));
  });
});
