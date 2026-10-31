import { CommandBus } from "@nestjs/cqrs";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { LoginWithGoogleCommand } from "@modules/session/application/command/login-with-google.command";
import { LoginWithGoogleCommandHandler } from "@modules/session/application/handler/login-with-google.command.handler";
import type { IExternalLoginClient } from "@modules/session/application/port/external-login-client.type";
import type { ILoginAttemptStore } from "@modules/session/application/port/login-attempt-store.type";
import { SessionIssuer } from "@modules/session/application/session-issuer";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { GOOGLE_LOGIN_CLIENT, LOGIN_ATTEMPT_STORE } from "@modules/session/session.tokens";
import { IdentityProvider, ResolveExternalUserCommand } from "@modules/user/user.module";

describe("LoginWithGoogleCommandHandler", () => {
  const consume = mockFn<ILoginAttemptStore["consume"]>();
  const authenticate = mockFn<IExternalLoginClient["authenticate"]>();
  const execute = jest.fn<Promise<object>, [ResolveExternalUserCommand]>();
  const create = jest.fn();
  const user = { id: "resolved-user" };
  const deviceInfo = { browser: null, os: null, deviceType: null };
  const profile = {
    providerUserId: "google-id",
    email: "ivan@example.com",
    emailConfirmed: true,
    name: "Ivan",
    surname: "Ivanov",
  };
  const command = new LoginWithGoogleCommand(deviceInfo, "127.0.0.1", "state", "code", undefined, "binding");
  let handler: LoginWithGoogleCommandHandler;

  beforeEach(async () => {
    consume.mockReset();
    authenticate.mockReset();
    execute.mockReset();
    create.mockReset();
    consume.mockResolvedValue({ nonce: "nonce", codeVerifier: "verifier" });
    authenticate.mockResolvedValue(profile);
    execute.mockResolvedValue(user);
    create.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });
    handler = await testHandler(LoginWithGoogleCommandHandler, [
      { provide: GOOGLE_LOGIN_CLIENT, useValue: { authenticate } },
      { provide: LOGIN_ATTEMPT_STORE, useValue: { consume } },
      { provide: CommandBus, useValue: { execute } },
      { provide: SessionIssuer, useValue: { create } },
    ]);
  });

  it("consumes the bound attempt, authenticates Google, resolves the user and issues a session", async () => {
    await expect(handler.execute(command)).resolves.toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(consume).toHaveBeenCalledWith("state", "binding");
    expect(authenticate).toHaveBeenCalledWith("code", "nonce", "verifier");
    expect(execute).toHaveBeenCalledWith(
      new ResolveExternalUserCommand(IdentityProvider.Google, "google-id", "ivan@example.com", true, "Ivan", "Ivanov")
    );
    expect(create).toHaveBeenCalledWith(user, deviceInfo, "127.0.0.1");
  });

  it.each([
    { state: undefined, binding: "binding" },
    { state: "", binding: "binding" },
    { state: "state", binding: undefined },
    { state: "state", binding: "" },
  ])("rejects invalid state/binding $state/$binding before consuming", async ({ state, binding }) => {
    await expect(
      handler.execute(new LoginWithGoogleCommand(deviceInfo, "127.0.0.1", state, "code", undefined, binding))
    ).rejects.toThrow(InvalidCredentialsException);
    expect(consume).not.toHaveBeenCalled();
    expect(authenticate).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an expired or consumed attempt", async () => {
    consume.mockResolvedValue(null);
    await expect(handler.execute(command)).rejects.toThrow(InvalidCredentialsException);
    expect(authenticate).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    { code: undefined, error: undefined },
    { code: "", error: undefined },
    { code: "code", error: "access_denied" },
  ])("rejects missing code or provider error $error", async ({ code, error }) => {
    await expect(
      handler.execute(new LoginWithGoogleCommand(deviceInfo, "127.0.0.1", "state", code, error, "binding"))
    ).rejects.toThrow(InvalidCredentialsException);
    expect(consume).toHaveBeenCalledWith("state", "binding");
    expect(authenticate).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("stops before user resolution when Google rejects authentication", async () => {
    const error = new InvalidCredentialsException();
    authenticate.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(execute).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("does not issue a session when user resolution fails", async () => {
    const error = new Error("resolution failed");
    execute.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
    expect(create).not.toHaveBeenCalled();
  });

  it("propagates session issuance errors", async () => {
    const error = new Error("session failed");
    create.mockRejectedValue(error);
    await expect(handler.execute(command)).rejects.toBe(error);
  });
});
