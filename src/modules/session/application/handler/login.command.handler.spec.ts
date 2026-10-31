import { Test } from "@nestjs/testing";

import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import type { DeviceInfo } from "@modules/session/application/device-info.type";
import { LoginCommandHandler } from "@modules/session/application/handler/login.command.handler";
import { SessionIssuer } from "@modules/session/application/session-issuer";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { Email, PASSWORD_HASHER, USER_REPOSITORY } from "@modules/user/user.module";

describe("LoginCommandHandler", () => {
  let handler: LoginCommandHandler;
  const user = { getPasswordHash: jest.fn<string | null, []>() };
  const findByEmail = jest.fn<Promise<typeof user | null>, [Email]>();
  const compare = jest.fn<Promise<boolean>, [string, string]>();
  const createSession = jest.fn<ReturnType<SessionIssuer["create"]>, Parameters<SessionIssuer["create"]>>();
  const deviceInfo: DeviceInfo = { browser: "Chrome", os: "Windows", deviceType: "desktop" };
  const command = new LoginCommand("ivan.ivanov@example.com", "S3cureP@ssw0rd", deviceInfo, "127.0.0.1");
  const tokens: LoginResult = { accessToken: "test-access-token", refreshToken: "test-refresh-token" };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoginCommandHandler,
        { provide: USER_REPOSITORY, useValue: { findByEmail } },
        { provide: PASSWORD_HASHER, useValue: { compare } },
        { provide: SessionIssuer, useValue: { create: createSession } },
      ],
    }).compile();

    handler = module.get(LoginCommandHandler);
  });

  beforeEach(() => {
    findByEmail.mockReset();
    compare.mockReset();
    createSession.mockReset();
    user.getPasswordHash.mockReset();
    user.getPasswordHash.mockReturnValue("stored-password-hash");
    findByEmail.mockResolvedValue(user);
    compare.mockResolvedValue(true);
    createSession.mockResolvedValue(tokens);
  });

  it("finds the user, checks the password and returns tokens from the session issuer", async () => {
    const result = await handler.execute(command);

    expect(findByEmail).toHaveBeenCalledTimes(1);
    expect(findByEmail).toHaveBeenCalledWith(new Email("ivan.ivanov@example.com"));
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith("S3cureP@ssw0rd", "stored-password-hash");
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith(user, deviceInfo, "127.0.0.1");
    expect(result).toEqual(tokens);
  });

  it("rejects an unknown user without comparing passwords or creating a session", async () => {
    findByEmail.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(InvalidCredentialsException);

    expect(findByEmail).toHaveBeenCalledWith(new Email(command.email));
    expect(compare).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects an account without a password without comparing passwords or creating a session", async () => {
    user.getPasswordHash.mockReturnValue(null);

    await expect(handler.execute(command)).rejects.toThrow(InvalidCredentialsException);

    expect(compare).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("rejects an incorrect password without creating a session", async () => {
    compare.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(InvalidCredentialsException);

    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith(command.password, "stored-password-hash");
    expect(createSession).not.toHaveBeenCalled();
  });

  it("propagates a repository failure without comparing passwords or creating a session", async () => {
    const error = new Error("User lookup failed");
    findByEmail.mockRejectedValue(error);

    await expect(handler.execute(command)).rejects.toBe(error);

    expect(compare).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("propagates a password comparison failure without creating a session", async () => {
    const error = new Error("Password comparison failed");
    compare.mockRejectedValue(error);

    await expect(handler.execute(command)).rejects.toBe(error);

    expect(createSession).not.toHaveBeenCalled();
  });

  it("propagates a blocked user error from the session issuer", async () => {
    const error = new UserBlockedException();
    createSession.mockRejectedValue(error);

    await expect(handler.execute(command)).rejects.toBe(error);

    expect(compare).toHaveBeenCalledWith(command.password, "stored-password-hash");
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalledWith(user, deviceInfo, command.ip);
  });

  it("propagates a session creation failure instead of returning tokens", async () => {
    const error = new Error("Session creation failed");
    createSession.mockRejectedValue(error);

    await expect(handler.execute(command)).rejects.toBe(error);

    expect(createSession).toHaveBeenCalledTimes(1);
  });
});
