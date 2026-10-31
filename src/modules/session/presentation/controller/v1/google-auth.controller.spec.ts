import type { IncomingHttpHeaders, Server } from "node:http";
import { Logger, VersioningType, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import { validationExceptionFactory } from "@shared/exception/factory/validation-exception.factory";
import { ExceptionFilter } from "@shared/exception/filter/exception.filter";
import cookieParser from "cookie-parser";
import request from "supertest";

import { LoginWithGoogleCommand } from "@modules/session/application/command/login-with-google.command";
import type { LoginResult } from "@modules/session/application/command/login.command";
import {
  StartGoogleLoginCommand,
  type StartGoogleLoginResult,
} from "@modules/session/application/command/start-google-login.command";
import type { DeviceInfo } from "@modules/session/application/device-info.type";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { DeviceInfoParser } from "@modules/session/infrastructure/device/device-info-parser";
import { GoogleAuthController } from "@modules/session/presentation/controller/v1/google-auth.controller";

import { setupGlobalPipes } from "@config/validation";

describe("GoogleAuthController (HTTP)", () => {
  let app: INestApplication<Server>;
  const execute = jest.fn<
    Promise<StartGoogleLoginResult | LoginResult>,
    [StartGoogleLoginCommand | LoginWithGoogleCommand]
  >();
  const parse = jest.fn<DeviceInfo, [IncomingHttpHeaders]>();
  const deviceInfo: DeviceInfo = { browser: null, os: null, deviceType: null };
  const state = "s".repeat(43);
  const authorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth?state=test-state";
  const webUrl = "https://app.example.com/";
  const config = new ConfigService({
    EXTERNAL_LOGIN_TTL: 600,
    REFRESH_TOKEN_TTL: 3600,
    NODE_ENV: "test",
    APP_WEB_URL: webUrl,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GoogleAuthController],
      providers: [
        { provide: CommandBus, useValue: { execute } },
        { provide: ConfigService, useValue: config },
        { provide: DeviceInfoParser, useValue: { parse } },
      ],
    }).compile();

    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.use(cookieParser());
    app.useGlobalFilters(new ExceptionFilter());
    setupGlobalPipes(app, validationExceptionFactory);
    await app.init();
  });

  beforeEach(() => {
    execute.mockReset();
    parse.mockReset();
    parse.mockReturnValue(deviceInfo);
    config.set("NODE_ENV", "test");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(["test", "production"])("sets the login cookie and redirects to Google in %s", async (environment) => {
    config.set("NODE_ENV", environment);
    execute.mockResolvedValue({ authorizationUrl, browserBinding: "test-browser-binding" });

    const response = await request(app.getHttpServer()).get("/v1/auth/google").expect(302);
    const secure = environment === "production" ? "; Secure" : "";

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(new StartGoogleLoginCommand());
    expect(parse).not.toHaveBeenCalled();
    expect(response.get("Location")).toBe(authorizationUrl);
    expect(response.get("Cache-Control")).toBe("no-store");
    expect(response.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.get("Set-Cookie")).toEqual([
      expect.stringMatching(
        new RegExp(
          `^google_login=test-browser-binding; Max-Age=600; Path=/; Expires=[^;]+; HttpOnly${secure}; SameSite=Lax$`
        )
      ) as unknown,
    ]);
  });

  it.each(["test", "production"])(
    "clears the login cookie, sets the refresh cookie and redirects after callback in %s",
    async (environment) => {
      config.set("NODE_ENV", environment);
      execute.mockResolvedValue({ accessToken: "test-access-token", refreshToken: "test-refresh-token" });

      const response = await request(app.getHttpServer())
        .get("/v1/auth/google/callback")
        .query({ state, code: "google-code" })
        .set("Cookie", "google_login=test-browser-binding")
        .set("User-Agent", "test-browser")
        .expect(302);
      const secure = environment === "production" ? "; Secure" : "";

      expect(execute).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledWith(expect.any(LoginWithGoogleCommand));
      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceInfo,
          ip: expect.any(String) as unknown,
          state,
          code: "google-code",
          error: undefined,
          browserBinding: "test-browser-binding",
        })
      );
      expect(parse).toHaveBeenCalledWith(expect.objectContaining({ "user-agent": "test-browser" }));
      expect(response.get("Location")).toBe(webUrl);
      expect(response.get("Cache-Control")).toBe("no-store");
      expect(response.get("Referrer-Policy")).toBe("no-referrer");
      expect(response.get("Set-Cookie")).toEqual([
        `google_login=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly${secure}; SameSite=Lax`,
        expect.stringMatching(
          new RegExp(
            `^refresh_token=test-refresh-token; Max-Age=3600; Path=/; Expires=[^;]+; HttpOnly${secure}; SameSite=Strict$`
          )
        ) as unknown,
      ]);
      expect(response.text).not.toContain("test-access-token");
      expect(response.text).not.toContain("test-refresh-token");
    }
  );

  it.each([
    { name: "Google denial", query: { state, error: "access_denied" }, browserBinding: "test-browser-binding" },
    { name: "missing query parameters", query: {}, browserBinding: "test-browser-binding" },
    { name: "missing browser cookie", query: { state, code: "google-code" }, browserBinding: undefined },
  ])("forwards $name to the command and returns its 401 error", async ({ query, browserBinding }) => {
    execute.mockRejectedValue(new InvalidCredentialsException("Google login rejected"));

    const httpRequest = request(app.getHttpServer()).get("/v1/auth/google/callback").query(query);

    if (browserBinding !== undefined) {
      httpRequest.set("Cookie", `google_login=${browserBinding}`);
    }

    const response = await httpRequest.expect(401);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(expect.any(LoginWithGoogleCommand));
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        state: query.state,
        code: "code" in query ? query.code : undefined,
        error: "error" in query ? query.error : undefined,
        browserBinding,
      })
    );
    expect(response.body).toEqual({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Google login rejected",
      path: expect.stringContaining("/v1/auth/google/callback") as unknown,
      timestamp: expect.any(String) as unknown,
    });
    expect(response.get("Location")).toBeUndefined();
    expect(response.get("Set-Cookie")).toEqual([
      "google_login=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
    ]);
  });

  it("returns 403 and clears only the login cookie when the user is blocked", async () => {
    execute.mockRejectedValue(new UserBlockedException());

    const response = await request(app.getHttpServer())
      .get("/v1/auth/google/callback")
      .query({ state, code: "google-code" })
      .set("Cookie", "google_login=test-browser-binding")
      .expect(403);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(response.body).toMatchObject({ status: 403, code: "USER_BLOCKED", message: "User is blocked" });
    expect(response.get("Location")).toBeUndefined();
    expect(response.get("Set-Cookie")).toEqual([
      "google_login=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
    ]);
  });

  it.each([
    { name: "empty code", query: { code: "" }, field: "code" },
    { name: "too long code", query: { code: "c".repeat(2049) }, field: "code" },
    { name: "repeated code", query: { code: ["one", "two"] }, field: "code" },
    { name: "too short state", query: { state: "s".repeat(42) }, field: "state" },
    { name: "too long state", query: { state: "s".repeat(44) }, field: "state" },
    { name: "repeated state", query: { state: [state, state] }, field: "state" },
    { name: "too long error", query: { error: "e".repeat(257) }, field: "error" },
    { name: "repeated error", query: { error: ["one", "two"] }, field: "error" },
  ])("returns 422 without executing a command for $name", async ({ query, field }) => {
    const response = await request(app.getHttpServer()).get("/v1/auth/google/callback").query(query).expect(422);

    expect(response.body).toMatchObject({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Validation failed",
      errors: [{ field, code: expect.any(String) as unknown, message: expect.any(String) as unknown }],
    });
    expect(execute).not.toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();
    expect(response.get("Location")).toBeUndefined();
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it.each(["/v1/auth/google", "/v1/auth/google/callback"])(
    "returns 500 without exposing internal errors at %s",
    async (path) => {
      jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
      execute.mockRejectedValue(new Error("Internal provider secret"));

      const response = await request(app.getHttpServer()).get(path).expect(500);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
        path,
        timestamp: expect.any(String) as unknown,
      });
      expect(response.get("Location")).toBeUndefined();
      expect(response.get("Set-Cookie")).toEqual(
        path.endsWith("/callback")
          ? ["google_login=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"]
          : undefined
      );
    }
  );
});
