import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { ConfirmEmailCommand } from "@modules/user/application/command/confirm-email.command";
import { ConfirmEmailCommandHandler } from "@modules/user/application/handler/confirm-email.command.handler";
import { makeUser, userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import type { IEmailConfirmationTokenService } from "@modules/user/application/port/email-confirmation-token.port";
import { UserEmailConfirmedStatus } from "@modules/user/domain/enum/user-email-confirmed-status.enum";
import { EmailAlreadyConfirmedException } from "@modules/user/domain/exception/email-already-confirmed.exception";
import { InvalidEmailConfirmationTokenException } from "@modules/user/domain/exception/invalid-email-confirmation-token.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { EMAIL_CONFIRMATION_TOKEN_SERVICE, USER_REPOSITORY } from "@modules/user/user.tokens";

describe("ConfirmEmailCommandHandler", () => {
  let repos: ReturnType<typeof userRepositories>;
  let user: ReturnType<typeof makeUser>;
  let handler: ConfirmEmailCommandHandler;
  const verify = mockFn<IEmailConfirmationTokenService["verify"]>();
  const command = new ConfirmEmailCommand("confirmation-token");

  beforeEach(async () => {
    repos = userRepositories();
    user = makeUser();
    verify.mockReset();
    verify.mockResolvedValue({ userId: user.getId().getValue(), email: user.getEmail().getValue() });
    repos.userRepository.findById.mockResolvedValue(user);
    handler = await testHandler(ConfirmEmailCommandHandler, [
      { provide: EMAIL_CONFIRMATION_TOKEN_SERVICE, useValue: { verify } },
      { provide: USER_REPOSITORY, useValue: repos.userRepository },
    ]);
  });

  it("verifies the token and confirms the matching email", async () => {
    await expect(handler.execute(command)).resolves.toBe(user);
    expect(verify).toHaveBeenCalledWith(command.token);
    expect(repos.userRepository.findById).toHaveBeenCalledWith(user.getId());
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Confirmed);
    expect(repos.userRepository.save).toHaveBeenCalledWith(user);
  });

  it("stops before lookup for an invalid token", async () => {
    const error = new InvalidEmailConfirmationTokenException();
    verify.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(repos.userRepository.findById).not.toHaveBeenCalled();
  });

  it("rejects a missing user", async () => {
    repos.userRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(command)).rejects.toThrow(UserNotFoundException);
    expect(repos.userRepository.save).not.toHaveBeenCalled();
  });

  it("rejects a token issued for an old email", async () => {
    verify.mockResolvedValue({ userId: user.getId().getValue(), email: "old@example.com" });
    await expect(handler.execute(command)).rejects.toThrow(InvalidEmailConfirmationTokenException);
    expect(user.getIsConfirmed()).toBe(UserEmailConfirmedStatus.Unconfirmed);
    expect(repos.userRepository.save).not.toHaveBeenCalled();
  });

  it("rejects an already confirmed email", async () => {
    user.confirmEmail();
    await expect(handler.execute(command)).rejects.toThrow(EmailAlreadyConfirmedException);
    expect(repos.userRepository.save).not.toHaveBeenCalled();
  });
});
