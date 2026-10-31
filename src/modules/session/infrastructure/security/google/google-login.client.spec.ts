import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoginTicket, OAuth2Client, type TokenPayload } from "google-auth-library";

import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { GoogleLoginClient } from "@modules/session/infrastructure/security/google/google-login.client";

describe("GoogleLoginClient", () => {
  const settings = {
    GOOGLE_CLIENT_ID: "test-client",
    GOOGLE_CLIENT_SECRET: "test-secret",
    GOOGLE_REDIRECT_URI: "https://id.example.com/google/callback",
    EXTERNAL_LOGIN_HTTP_TIMEOUT: 3000,
  };
  const google = OAuth2Client.prototype as unknown as {
    getToken(options: {
      code: string;
      codeVerifier: string;
    }): Promise<{ tokens: { id_token?: string | null }; res: null }>;
    verifyIdToken(options: { idToken: string; audience: string }): Promise<LoginTicket>;
  };
  let config: ConfigService;
  let client: GoogleLoginClient;
  let payload: TokenPayload & { nonce?: string };

  beforeEach(() => {
    jest.replaceProperty(process, "env", {});
    config = new ConfigService({ ...settings });

    client = new GoogleLoginClient(config);
    payload = {
      iss: "https://accounts.google.com",
      aud: "test-client",
      sub: "google-subject",
      iat: 1,
      exp: 9999999999,
      nonce: "expected-nonce",
      email: "ivan@gmail.com",
      email_verified: true,
      given_name: " Ivan ",
      family_name: " Ivanov ",
    };
    jest
      .spyOn(google, "getToken")
      .mockImplementation(() => Promise.resolve({ tokens: { id_token: "google-id-token" }, res: null }));
    jest.spyOn(google, "verifyIdToken").mockImplementation(() => Promise.resolve(new LoginTicket(undefined, payload)));
  });

  afterEach(() => jest.restoreAllMocks());

  it("builds a Google authorization URL with state, nonce, PKCE and configured callback", () => {
    const url = new URL(client.authorizationUrl("state + & value", "nonce-value", "challenge-value"));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe(settings.GOOGLE_CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(settings.GOOGLE_REDIRECT_URI);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state + & value");
    expect(url.searchParams.get("nonce")).toBe("nonce-value");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-value");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(["openid", "email", "profile"]);
    expect(url.searchParams.has("client_secret")).toBe(false);
  });

  it("exchanges the code with its PKCE verifier and verifies the ID token audience", async () => {
    await expect(client.authenticate("auth-code", "expected-nonce", "code-verifier")).resolves.toEqual({
      providerUserId: "google-subject",
      email: "ivan@gmail.com",
      emailConfirmed: true,
      name: "Ivan",
      surname: "Ivanov",
    });
    expect(google.getToken).toHaveBeenCalledWith({ code: "auth-code", codeVerifier: "code-verifier" });
    expect(google.verifyIdToken).toHaveBeenCalledWith({
      idToken: "google-id-token",
      audience: "test-client",
    });
  });

  it.each([
    { email: "IVAN@GMAIL.COM", hd: undefined, confirmed: true },
    { email: "ivan@company.example", hd: "company.example", confirmed: true },
    { email: "ivan@external.example", hd: undefined, confirmed: false },
    { email: "ivan@gmail.com.attacker.example", hd: undefined, confirmed: false },
  ])("sets confirmation from Google authority for $email", async ({ email, hd, confirmed }) => {
    Object.assign(payload, { email, hd });
    await expect(client.authenticate("code", "expected-nonce", "verifier")).resolves.toMatchObject({
      email,
      emailConfirmed: confirmed,
    });
  });

  it.each([undefined, null, ""])("rejects missing ID token %p before verification", async (idToken) => {
    jest
      .spyOn(google, "getToken")
      .mockImplementation(() => Promise.resolve({ tokens: { id_token: idToken }, res: null }));
    await expect(client.authenticate("code", "expected-nonce", "verifier")).rejects.toThrow(
      InvalidCredentialsException
    );
    expect(google.verifyIdToken).not.toHaveBeenCalled();
  });

  it.each([
    { field: "nonce", value: undefined },
    { field: "nonce", value: "wrong-nonce" },
    { field: "sub", value: "" },
    { field: "email", value: undefined },
    { field: "email", value: "" },
    { field: "email_verified", value: false },
    { field: "email_verified", value: undefined },
    { field: "email_verified", value: "true" },
  ])("rejects invalid Google claim $field=$value", async ({ field, value }) => {
    Object.assign(payload, { [field]: value });
    await expect(client.authenticate("code", "expected-nonce", "verifier")).rejects.toThrow(
      InvalidCredentialsException
    );
  });

  it("rejects a verified ticket without a payload", async () => {
    jest.spyOn(google, "verifyIdToken").mockImplementation(() => Promise.resolve(new LoginTicket()));
    await expect(client.authenticate("code", "expected-nonce", "verifier")).rejects.toThrow(
      InvalidCredentialsException
    );
  });

  it.each(["exchange", "verification"])("maps %s failures without exposing upstream details", async (stage) => {
    const error = new Error("Upstream secret details");

    if (stage === "exchange") jest.spyOn(google, "getToken").mockImplementation(() => Promise.reject(error));
    else jest.spyOn(google, "verifyIdToken").mockImplementation(() => Promise.reject(error));

    await expect(client.authenticate("code", "expected-nonce", "verifier")).rejects.toThrow(
      "Google authentication failed"
    );

    if (stage === "exchange") expect(google.verifyIdToken).not.toHaveBeenCalled();
  });

  it.each([undefined, "", " ", "A", "a".repeat(65)])(
    "uses fallback names for unsupported profile value %p",
    async (value) => {
      Object.assign(payload, { given_name: value, family_name: value });
      await expect(client.authenticate("code", "expected-nonce", "verifier")).resolves.toMatchObject({
        name: "Пользователь",
        surname: "Не указана",
      });
    }
  );

  it.each(["Al", "a".repeat(64)])("accepts name length boundaries after trimming: %s", async (value) => {
    Object.assign(payload, { given_name: ` ${value} `, family_name: ` ${value} ` });
    await expect(client.authenticate("code", "expected-nonce", "verifier")).resolves.toMatchObject({
      name: value,
      surname: value,
    });
  });
  describe.each(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"])("missing %s", (key) => {
    it.each([undefined, ""])("rejects unconfigured sign-in (%p) before network calls", async (value) => {
      config = new ConfigService({ ...settings, [key]: value });
      client = new GoogleLoginClient(config);
      expect(() => client.authorizationUrl("state", "nonce", "challenge")).toThrow(ServiceUnavailableException);
      await expect(client.authenticate("code", "nonce", "verifier")).rejects.toThrow(ServiceUnavailableException);
      expect(google.getToken).not.toHaveBeenCalled();
    });
  });
});
