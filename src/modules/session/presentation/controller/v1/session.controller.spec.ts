import type { Server } from "node:http";
import { VersioningType, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { ExceptionFilter } from "@shared/exception/filter/exception.filter";
import type { NextFunction, Response } from "express";
import request from "supertest";

import { RevokeSessionCommand } from "@modules/session/application/command/revoke-session.command";
import { ListActiveSessionsQuery } from "@modules/session/application/query/list-active-sessions.query";
import { Session } from "@modules/session/domain/entity/session";
import { SessionNotFoundException } from "@modules/session/domain/exception/session-not-found.exception";
import { Browser } from "@modules/session/domain/value-object/browser.value-object";
import { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";
import { SessionController } from "@modules/session/presentation/controller/v1/session.controller";
import { SessionId } from "@modules/session/session.ids";
import { UserId } from "@modules/user/user.ids";

describe("SessionController (HTTP)", () => {
  let app: INestApplication<Server>;
  let currentUser: AuthenticatedUser | undefined;
  const userId = "00000000-0000-4000-8000-000000000001";
  const currentSessionId = "00000000-0000-4000-8000-000000000002";
  const otherSessionId = "00000000-0000-4000-8000-000000000003";
  const queryExecute = jest.fn<Promise<Session[]>, [ListActiveSessionsQuery]>();
  const commandExecute = jest.fn<Promise<void>, [RevokeSessionCommand]>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        { provide: QueryBus, useValue: { execute: queryExecute } },
        { provide: CommandBus, useValue: { execute: commandExecute } },
        { provide: ConfigService, useValue: new ConfigService({ REFRESH_TOKEN_TTL: 3600, NODE_ENV: "test" }) },
      ],
    }).compile();

    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalFilters(new ExceptionFilter());
    app.use((httpRequest: AuthenticatedRequest, _response: Response, next: NextFunction) => {
      if (currentUser !== undefined) {
        httpRequest.user = currentUser;
        httpRequest.auth = { ...currentUser, type: AccessTokenType.Session };
      }

      next();
    });
    await app.init();
  });

  beforeEach(() => {
    queryExecute.mockReset();
    commandExecute.mockReset();
    currentUser = { userId, sessionId: currentSessionId, sessionVersion: 1, roles: [] };
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns an empty list when the user has no active sessions", async () => {
    queryExecute.mockResolvedValue([]);

    const response = await request(app.getHttpServer()).get("/v1/users/me/sessions").expect(200);

    expect(response.body).toEqual([]);
    expect(queryExecute).toHaveBeenCalledTimes(1);
    expect(queryExecute).toHaveBeenCalledWith(new ListActiveSessionsQuery(userId));
    expect(commandExecute).not.toHaveBeenCalled();
  });

  it("returns session DTOs and marks only the current session", async () => {
    const createdAt = new Date("2026-10-01T10:00:00.000Z");
    const lastUsedAt = new Date("2026-10-02T12:00:00.000Z");
    const expiresAt = new Date("2026-11-01T10:00:00.000Z");
    queryExecute.mockResolvedValue([
      new Session(
        SessionId.from(currentSessionId),
        UserId.from(userId),
        new Browser("Chrome"),
        new OperatingSystem("Windows"),
        new DeviceType("desktop"),
        new Ip("127.0.0.1"),
        createdAt,
        expiresAt,
        lastUsedAt,
        null
      ),
      new Session(
        SessionId.from(otherSessionId),
        UserId.from(userId),
        null,
        null,
        null,
        new Ip("127.0.0.2"),
        createdAt,
        expiresAt,
        lastUsedAt,
        null
      ),
    ]);

    const response = await request(app.getHttpServer()).get("/v1/users/me/sessions").expect(200);

    expect(queryExecute).toHaveBeenCalledTimes(1);
    expect(queryExecute).toHaveBeenCalledWith(new ListActiveSessionsQuery(userId));
    expect(response.body).toEqual([
      {
        id: currentSessionId,
        browser: "Chrome",
        os: "Windows",
        deviceType: "desktop",
        createdAt: "2026-10-01T10:00:00.000Z",
        lastUsedAt: "2026-10-02T12:00:00.000Z",
        isCurrent: true,
      },
      {
        id: otherSessionId,
        browser: null,
        os: null,
        deviceType: null,
        createdAt: "2026-10-01T10:00:00.000Z",
        lastUsedAt: "2026-10-02T12:00:00.000Z",
        isCurrent: false,
      },
    ]);
    expect(commandExecute).not.toHaveBeenCalled();
  });

  it("revokes another session without clearing the refresh cookie", async () => {
    commandExecute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer()).delete(`/v1/users/me/sessions/${otherSessionId}`).expect(204);

    expect(commandExecute).toHaveBeenCalledTimes(1);
    expect(commandExecute).toHaveBeenCalledWith(new RevokeSessionCommand(userId, otherSessionId));
    expect(response.text).toBe("");
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it("clears the refresh cookie when revoking the current session", async () => {
    commandExecute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer()).delete(`/v1/users/me/sessions/${currentSessionId}`).expect(204);

    expect(commandExecute).toHaveBeenCalledTimes(1);
    expect(commandExecute).toHaveBeenCalledWith(new RevokeSessionCommand(userId, currentSessionId));
    expect(response.text).toBe("");
    expect(response.get("Set-Cookie")).toEqual([
      expect.stringMatching(
        /^refresh_token=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict$/
      ) as unknown,
    ]);
  });

  it("returns 400 without executing a command when the session ID is not a UUID", async () => {
    const response = await request(app.getHttpServer()).delete("/v1/users/me/sessions/invalid-id").expect(400);

    expect(response.body).toMatchObject({ status: 400, code: "BAD_REQUEST" });
    expect(commandExecute).not.toHaveBeenCalled();
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it.each([currentSessionId, otherSessionId])(
    "returns 404 without clearing cookies when session %s is not found",
    async (sessionId) => {
      commandExecute.mockRejectedValue(new SessionNotFoundException());

      const response = await request(app.getHttpServer()).delete(`/v1/users/me/sessions/${sessionId}`).expect(404);

      expect(commandExecute).toHaveBeenCalledTimes(1);
      expect(commandExecute).toHaveBeenCalledWith(new RevokeSessionCommand(userId, sessionId));
      expect(response.body).toEqual({
        status: 404,
        code: "SESSION_NOT_FOUND",
        message: "Session not found",
        path: `/v1/users/me/sessions/${sessionId}`,
        timestamp: expect.any(String) as unknown,
      });
      expect(response.get("Set-Cookie")).toBeUndefined();
    }
  );

  it("returns 401 without executing a query when the current user is missing", async () => {
    currentUser = undefined;

    await request(app.getHttpServer()).get("/v1/users/me/sessions").expect(401);

    expect(queryExecute).not.toHaveBeenCalled();
    expect(commandExecute).not.toHaveBeenCalled();
  });

  it("returns 401 without executing a command when the current user is missing", async () => {
    currentUser = undefined;

    const response = await request(app.getHttpServer()).delete(`/v1/users/me/sessions/${currentSessionId}`).expect(401);

    expect(commandExecute).not.toHaveBeenCalled();
    expect(response.get("Set-Cookie")).toBeUndefined();
  });
});
