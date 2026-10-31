import type { IncomingHttpHeaders, Server } from "node:http";
import { VersioningType, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import { validationExceptionFactory } from "@shared/exception/factory/validation-exception.factory";
import { ExceptionFilter } from "@shared/exception/filter/exception.filter";
import cookieParser from "cookie-parser";
import request from "supertest";

import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import { LogoutAllCommand } from "@modules/session/application/command/logout-all.command";
import { LogoutCommand } from "@modules/session/application/command/logout.command";
import { RefreshCommand } from "@modules/session/application/command/refresh.command";
import type { DeviceInfo } from "@modules/session/application/device-info.type";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { DeviceInfoParser } from "@modules/session/infrastructure/device/device-info-parser";
import { AuthController } from "@modules/session/presentation/controller/v1/auth.controller";

import { setupGlobalPipes } from "@config/validation";

describe("AuthController (HTTP)", () => {
  let app: INestApplication<Server>;
  const execute = jest.fn<
    Promise<LoginResult | void>,
    [LoginCommand | RefreshCommand | LogoutCommand | LogoutAllCommand]
  >();
  const deviceInfo: DeviceInfo = { browser: null, os: null, deviceType: null };
  const parse = jest.fn<DeviceInfo, [IncomingHttpHeaders]>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: CommandBus, useValue: { execute } },
        { provide: ConfigService, useValue: new ConfigService({ REFRESH_TOKEN_TTL: 3600, NODE_ENV: "test" }) },
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
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without executing a command when the refresh cookie is missing", async () => {
    const response = await request(app.getHttpServer()).post("/v1/auth/refresh").expect(401);

    expect(response.body).toEqual({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token cookie is missing",
      path: "/v1/auth/refresh",
      timestamp: expect.any(String) as unknown,
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns an access token and sets the refresh cookie after login", async () => {
    execute.mockResolvedValue({ accessToken: "test-access-token", refreshToken: "test-refresh-token" });

    const response = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .set("User-Agent", "test-browser")
      .send({ email: "ivan.ivanov@example.com", password: "S3cureP@ssw0rd" })
      .expect(200);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(expect.any(LoginCommand));
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ivan.ivanov@example.com",
        password: "S3cureP@ssw0rd",
        deviceInfo,
        ip: expect.any(String) as unknown,
      })
    );
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ "user-agent": "test-browser" }));
    expect(response.body).toEqual({ accessToken: "test-access-token" });
    expect(response.get("Set-Cookie")).toEqual([
      expect.stringMatching(/^refresh_token=test-refresh-token;.*HttpOnly; SameSite=Strict$/) as unknown,
    ]);
  });

  it("executes logout and clears the refresh cookie", async () => {
    execute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post("/v1/auth/logout")
      .set("Cookie", "refresh_token=test-refresh-token")
      .expect(204);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(new LogoutCommand("test-refresh-token"));
    expect(response.text).toBe("");
    expect(response.get("Set-Cookie")).toEqual([
      expect.stringMatching(
        /^refresh_token=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict$/
      ) as unknown,
    ]);
  });

  it("executes logout-all and clears the refresh cookie", async () => {
    execute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post("/v1/auth/logout-all")
      .set("Cookie", "refresh_token=test-refresh-token")
      .expect(204);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(new LogoutAllCommand("test-refresh-token"));
    expect(response.text).toBe("");
    expect(response.get("Set-Cookie")).toEqual([
      expect.stringMatching(
        /^refresh_token=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict$/
      ) as unknown,
    ]);
  });

  it("returns 401 without executing logout when the refresh cookie is missing", async () => {
    const response = await request(app.getHttpServer()).post("/v1/auth/logout").expect(401);

    expect(response.body).toEqual({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token cookie is missing",
      path: "/v1/auth/logout",
      timestamp: expect.any(String) as unknown,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it("returns 401 without executing logout-all when the refresh cookie is missing", async () => {
    const response = await request(app.getHttpServer()).post("/v1/auth/logout-all").expect(401);

    expect(response.body).toEqual({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token cookie is missing",
      path: "/v1/auth/logout-all",
      timestamp: expect.any(String) as unknown,
    });
    expect(execute).not.toHaveBeenCalled();
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it("returns a new access token and replaces the refresh cookie after refresh", async () => {
    execute.mockResolvedValue({ accessToken: "new-access-token", refreshToken: "new-refresh-token" });

    const response = await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .set("Cookie", "refresh_token=old-refresh-token")
      .set("User-Agent", "test-browser")
      .expect(200);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(expect.any(RefreshCommand));
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: "old-refresh-token",
        deviceInfo,
        ip: expect.any(String) as unknown,
      })
    );
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ "user-agent": "test-browser" }));
    expect(response.body).toEqual({ accessToken: "new-access-token" });
    expect(response.get("Set-Cookie")).toEqual([
      expect.stringMatching(/^refresh_token=new-refresh-token;.*HttpOnly; SameSite=Strict$/) as unknown,
    ]);
  });

  it("returns 401 without setting a cookie when login credentials are invalid", async () => {
    execute.mockRejectedValue(new InvalidCredentialsException());

    const response = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ email: "ivan.ivanov@example.com", password: "Wr0ngP@ssword" })
      .expect(401);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(expect.any(LoginCommand));
    expect(response.body).toEqual({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "Invalid credentials",
      path: "/v1/auth/login",
      timestamp: expect.any(String) as unknown,
    });
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it.each(["login", "refresh"])(
    "returns 403 without setting a cookie when %s reports a blocked user",
    async (route) => {
      execute.mockRejectedValue(new UserBlockedException());

      const response = await request(app.getHttpServer())
        .post(`/v1/auth/${route}`)
        .set("Cookie", "refresh_token=test-refresh-token")
        .send({ email: "ivan.ivanov@example.com", password: "S3cureP@ssw0rd" })
        .expect(403);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(response.body).toEqual({
        status: 403,
        code: "USER_BLOCKED",
        message: "User is blocked",
        path: `/v1/auth/${route}`,
        timestamp: expect.any(String) as unknown,
      });
      expect(response.get("Set-Cookie")).toBeUndefined();
    }
  );

  it.each([
    { route: "refresh", command: RefreshCommand },
    { route: "logout", command: LogoutCommand },
    { route: "logout-all", command: LogoutAllCommand },
  ])("returns 401 without changing cookies when $route rejects the refresh token", async ({ route, command }) => {
    execute.mockRejectedValue(new InvalidRefreshTokenException());

    const response = await request(app.getHttpServer())
      .post(`/v1/auth/${route}`)
      .set("Cookie", "refresh_token=invalid-refresh-token")
      .expect(401);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(expect.any(command));
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ refreshToken: "invalid-refresh-token" }));
    expect(response.body).toEqual({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
      message: "Invalid refresh token",
      path: `/v1/auth/${route}`,
      timestamp: expect.any(String) as unknown,
    });
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it.each([
    { name: "missing email", body: { password: "S3cureP@ssw0rd" }, field: "email" },
    { name: "missing password", body: { email: "ivan.ivanov@example.com" }, field: "password" },
    { name: "empty email", body: { email: "", password: "S3cureP@ssw0rd" }, field: "email" },
    { name: "invalid email format", body: { email: "invalid-email", password: "S3cureP@ssw0rd" }, field: "email" },
    { name: "non-string email", body: { email: 123, password: "S3cureP@ssw0rd" }, field: "email" },
    {
      name: "too long email",
      body: { email: `${"a".repeat(129)}@example.com`, password: "S3cureP@ssw0rd" },
      field: "email",
    },
    { name: "empty password", body: { email: "ivan.ivanov@example.com", password: "" }, field: "password" },
    { name: "non-string password", body: { email: "ivan.ivanov@example.com", password: 123 }, field: "password" },
    { name: "too short password", body: { email: "ivan.ivanov@example.com", password: "A" }, field: "password" },
    {
      name: "too long password",
      body: { email: "ivan.ivanov@example.com", password: `Aa1!${"a".repeat(61)}` },
      field: "password",
    },
    {
      name: "invalid password format",
      body: { email: "ivan.ivanov@example.com", password: "password" },
      field: "password",
    },
  ])("returns 422 without executing login for $name", async ({ body, field }) => {
    const response = await request(app.getHttpServer()).post("/v1/auth/login").send(body).expect(422);

    expect(response.body).toEqual({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Validation failed",
      path: "/v1/auth/login",
      timestamp: expect.any(String) as unknown,
      errors: [
        {
          field,
          code: expect.any(String) as unknown,
          message: expect.any(String) as unknown,
        },
      ],
    });
    expect(execute).not.toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();
    expect(response.get("Set-Cookie")).toBeUndefined();
  });
});
