import { createHash } from "node:crypto";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { StartGoogleLoginCommandHandler } from "@modules/session/application/handler/start-google-login.command.handler";
import type { IExternalLoginClient } from "@modules/session/application/port/external-login-client.type";
import type { ILoginAttemptStore } from "@modules/session/application/port/login-attempt-store.type";
import { GOOGLE_LOGIN_CLIENT, LOGIN_ATTEMPT_STORE } from "@modules/session/session.tokens";

describe("StartGoogleLoginCommandHandler", () => {
  const authorizationUrl = mockFn<IExternalLoginClient["authorizationUrl"]>();
  const save = mockFn<ILoginAttemptStore["save"]>();
  let handler: StartGoogleLoginCommandHandler;

  beforeEach(async () => {
    authorizationUrl.mockReset();
    save.mockReset();
    authorizationUrl.mockReturnValue("https://accounts.google.com/authorize");
    handler = await testHandler(StartGoogleLoginCommandHandler, [
      { provide: GOOGLE_LOGIN_CLIENT, useValue: { authorizationUrl } },
      { provide: LOGIN_ATTEMPT_STORE, useValue: { save } },
    ]);
  });

  it("generates independent state, binding and nonce and saves a matching PKCE verifier", async () => {
    const result = await handler.execute();
    const call = save.mock.calls[0];
    expect(call).toBeDefined();

    if (call === undefined) {
      throw new Error("Login attempt was not saved");
    }

    const [state, binding, attempt] = call;
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(binding).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(attempt.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(attempt.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Set([state, binding, attempt.nonce, attempt.codeVerifier]).size).toBe(4);
    expect(authorizationUrl).toHaveBeenCalledWith(
      state,
      attempt.nonce,
      createHash("sha256").update(attempt.codeVerifier).digest("base64url")
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ authorizationUrl: "https://accounts.google.com/authorize", browserBinding: binding });
  });

  it("does not return a login URL if storing the attempt fails", async () => {
    const error = new Error("store failed");
    save.mockRejectedValue(error);
    await expect(handler.execute()).rejects.toBe(error);
  });

  it("does not save an attempt if URL generation fails", async () => {
    const error = new Error("URL failed");
    authorizationUrl.mockImplementation(() => {
      throw error;
    });
    await expect(handler.execute()).rejects.toBe(error);
    expect(save).not.toHaveBeenCalled();
  });
});
