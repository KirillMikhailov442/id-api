import type { Server } from "node:http";
import { VersioningType, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { CqrsModule } from "@nestjs/cqrs";
import { Test } from "@nestjs/testing";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { validationExceptionFactory } from "@shared/exception/factory/validation-exception.factory";
import { ExceptionFilter } from "@shared/exception/filter/exception.filter";
import { oauthAuth, sessionAuth } from "@shared/testing/auth-test.spec-support";
import type { NextFunction, Response } from "express";
import request from "supertest";

import { GetUserSessionQueryHandler } from "@modules/session/application/handler/get-user-session.query.handler";
import { ListActiveSessionsQueryHandler } from "@modules/session/application/handler/list-active-sessions.query.handler";
import { ListUserSessionsQueryHandler } from "@modules/session/application/handler/list-user-sessions.query.handler";
import { RevokeSessionCommandHandler } from "@modules/session/application/handler/revoke-session.command.handler";
import { RevokeUserSessionsCommandHandler } from "@modules/session/application/handler/revoke-user-sessions.command.handler";
import { sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import { Session } from "@modules/session/domain/entity/session";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { AdminSessionController } from "@modules/session/presentation/controller/v1/admin-session.controller";
import { SessionController } from "@modules/session/presentation/controller/v1/session.controller";
import { RolesGuard } from "@modules/session/presentation/guard/roles.guard";
import { SessionId } from "@modules/session/session.ids";
import { SESSION_REPOSITORY } from "@modules/session/session.tokens";
import { GetUserQueryHandler } from "@modules/user/application/handler/get-user.query.handler";
import {
  makeRole,
  makeUser,
  userRepositories,
  withUserRoles,
} from "@modules/user/application/handler/user-test.spec-support";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

import { setupGlobalPipes } from "@config/validation";

describe("AdminSessionController (HTTP)", () => {
  let app: INestApplication<Server>;
  let auth: AuthContext | undefined;
  const repository = sessionRepository();
  const { userRepository } = userRepositories();
  const user = makeUser();
  const session = new Session(
    SessionId.create(),
    user.getId(),
    null,
    null,
    null,
    new Ip("127.0.0.1"),
    new Date("2026-01-01T00:00:00Z"),
    new Date("2026-02-01T00:00:00Z"),
    new Date("2026-01-02T00:00:00Z"),
    new Date("2026-01-03T00:00:00Z")
  );
  const baseUrl = `/v1/users/${user.getId().getValue()}/sessions`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CqrsModule.forRoot()],
      controllers: [SessionController, AdminSessionController],
      providers: [
        ListActiveSessionsQueryHandler,
        GetUserQueryHandler,
        ListUserSessionsQueryHandler,
        GetUserSessionQueryHandler,
        RevokeSessionCommandHandler,
        RevokeUserSessionsCommandHandler,
        { provide: ConfigService, useValue: new ConfigService({ REFRESH_TOKEN_TTL: 3600, NODE_ENV: "test" }) },
        { provide: SESSION_REPOSITORY, useValue: repository },
        { provide: USER_REPOSITORY, useValue: userRepository },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalFilters(new ExceptionFilter());
    setupGlobalPipes(app, validationExceptionFactory);
    app.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      req.auth = auth;

      if (auth?.type === AccessTokenType.Session) req.user = auth;

      next();
    });
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    auth = sessionAuth([RoleType.Admin]);
    userRepository.findById.mockResolvedValue(user);
    repository.findPageByUserId.mockResolvedValue({ items: [session], total: 1 });
    repository.findById.mockResolvedValue(session);
    repository.revokeByIdAndUserId.mockResolvedValue(true);
    repository.revokeAllByUserId.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([RoleType.Admin, RoleType.SuperUser])(
    "allows %s to list retained sessions without credentials",
    async (role) => {
      auth = sessionAuth([role]);

      const response = await request(app.getHttpServer()).get(baseUrl).expect(200);
      expect(response.body).toEqual({
        items: [
          {
            id: session.getId().getValue(),
            userId: user.getId().getValue(),
            browser: null,
            os: null,
            deviceType: null,
            ip: "127.0.0.1",
            createdAt: "2026-01-01T00:00:00.000Z",
            lastUsedAt: "2026-01-02T00:00:00.000Z",
            expiresAt: "2026-02-01T00:00:00.000Z",
            revokedAt: "2026-01-03T00:00:00.000Z",
            isCurrent: false,
          },
        ],
        meta: { total: 1, limit: 20, offset: 0 },
      });
      expect(repository.findPageByUserId).toHaveBeenCalledWith(
        user.getId(),
        { limit: 20, offset: 0 },
        { search: undefined, activeOnly: false }
      );
    }
  );

  it("keeps the own-session route accessible to ordinary users", async () => {
    auth = sessionAuth([RoleType.User]);
    repository.findPageByUserId.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/v1/users/me/sessions")
      .expect(200, { items: [], meta: { total: 0, limit: 20, offset: 0 } });
    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(repository.findPageByUserId).toHaveBeenCalled();
  });

  it("returns an empty list for a user without retained sessions", async () => {
    repository.findPageByUserId.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get(baseUrl)
      .expect(200, { items: [], meta: { total: 0, limit: 20, offset: 0 } });
  });

  it("forwards search and pagination for retained sessions", async () => {
    repository.findPageByUserId.mockResolvedValue({ items: [], total: 3 });

    const response = await request(app.getHttpServer())
      .get(baseUrl)
      .query({ search: "127.0", limit: 1, offset: 3 })
      .expect(200);
    expect(response.body).toEqual({ items: [], meta: { total: 3, limit: 1, offset: 3 } });
    expect(repository.findPageByUserId).toHaveBeenCalledWith(
      user.getId(),
      { limit: 1, offset: 3 },
      { search: "127.0", activeOnly: false }
    );
  });

  it.each([{ limit: 0 }, { limit: 101 }, { offset: -1 }, { search: "a".repeat(256) }, { search: ["a", "b"] }])(
    "rejects invalid list parameters %j",
    async (params) => {
      await request(app.getHttpServer()).get(baseUrl).query(params).expect(422);
      expect(repository.findPageByUserId).not.toHaveBeenCalled();
      expect(userRepository.findById).not.toHaveBeenCalled();
    }
  );

  it("returns a specific session and identifies the current session", async () => {
    auth = { ...sessionAuth([RoleType.Admin]), sessionId: session.getId().getValue() };

    const response = await request(app.getHttpServer()).get(`${baseUrl}/${session.getId().getValue()}`).expect(200);
    expect(response.body).toEqual(expect.objectContaining({ id: session.getId().getValue(), isCurrent: true }));
    expect(repository.findById).toHaveBeenCalledWith(session.getId());
  });

  it.each(["", "/00000000-0000-4000-8000-000000000009"])("returns 404 for a missing user on %s", async (suffix) => {
    userRepository.findById.mockResolvedValue(null);

    const response = await request(app.getHttpServer()).get(`${baseUrl}${suffix}`).expect(404);
    expect(response.body).toEqual(expect.objectContaining({ code: "USER_NOT_FOUND" }));
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.findPageByUserId).not.toHaveBeenCalled();
  });

  it.each([null, "foreign"])("returns 404 for a missing or foreign session: %s", async (kind) => {
    repository.findById.mockResolvedValue(
      kind === null
        ? null
        : Session.create({
            userId: makeUser().getId(),
            browser: null,
            os: null,
            deviceType: null,
            ip: new Ip("127.0.0.1"),
            expiresAt: new Date("2100-01-01"),
          })
    );

    const response = await request(app.getHttpServer()).get(`${baseUrl}/${session.getId().getValue()}`).expect(404);
    expect(response.body).toEqual(expect.objectContaining({ code: "SESSION_NOT_FOUND" }));
  });

  it.each(["", "/00000000-0000-4000-8000-000000000009"])(
    "hides superuser sessions from ADMIN on %s",
    async (suffix) => {
      userRepository.findById.mockResolvedValue(withUserRoles(user, [makeRole(RoleType.SuperUser)]));
      await request(app.getHttpServer()).get(`${baseUrl}${suffix}`).expect(404);
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.findPageByUserId).not.toHaveBeenCalled();
    }
  );

  it("allows SUPERUSER to inspect superuser sessions", async () => {
    auth = sessionAuth([RoleType.SuperUser]);
    userRepository.findById.mockResolvedValue(withUserRoles(user, [makeRole(RoleType.SuperUser)]));
    await request(app.getHttpServer()).get(baseUrl).expect(200);
  });

  it.each([
    [undefined, 401],
    [sessionAuth([RoleType.User]), 403],
    [oauthAuth(["ADMIN"]), 403],
  ] as const)("rejects unauthorized auth %j", async (context, status) => {
    auth = context;

    for (const suffix of ["", `/${session.getId().getValue()}`]) {
      await request(app.getHttpServer()).get(`${baseUrl}${suffix}`).expect(status);
      await request(app.getHttpServer()).delete(`${baseUrl}${suffix}`).expect(status);
    }

    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(repository.findPageByUserId).not.toHaveBeenCalled();
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.revokeByIdAndUserId).not.toHaveBeenCalled();
    expect(repository.revokeAllByUserId).not.toHaveBeenCalled();
  });

  it.each([
    "/v1/users/invalid/sessions",
    `/v1/users/invalid/sessions/${session.getId().getValue()}`,
    `${baseUrl}/invalid`,
  ])("validates UUIDs: %s", async (url) => {
    await request(app.getHttpServer()).get(url).expect(400);
    await request(app.getHttpServer()).delete(url).expect(400);
    expect(repository.revokeByIdAndUserId).not.toHaveBeenCalled();
    expect(repository.revokeAllByUserId).not.toHaveBeenCalled();
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it.each([RoleType.Admin, RoleType.SuperUser])("allows %s to revoke one or all user sessions", async (role) => {
    auth = sessionAuth([role]);

    const response = await request(app.getHttpServer()).delete(`${baseUrl}/${session.getId().getValue()}`).expect(204);
    expect(response.text).toBe("");
    expect(response.get("Set-Cookie")).toBeUndefined();
    expect(repository.revokeByIdAndUserId).toHaveBeenCalledWith(session.getId(), user.getId(), expect.any(Date));

    const allResponse = await request(app.getHttpServer()).delete(baseUrl).expect(204);
    expect(allResponse.text).toBe("");
    expect(allResponse.get("Set-Cookie")).toBeUndefined();
    expect(repository.revokeAllByUserId).toHaveBeenCalledWith(user.getId(), expect.any(Date));
  });

  it("returns 404 when revoking a missing session or a session belonging to another user", async () => {
    repository.revokeByIdAndUserId.mockResolvedValue(false);

    const response = await request(app.getHttpServer()).delete(`${baseUrl}/${session.getId().getValue()}`).expect(404);
    expect(response.body).toEqual(expect.objectContaining({ code: "SESSION_NOT_FOUND" }));
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it.each(["missing", "superuser"])("prevents revocation for a %s target user", async (kind) => {
    userRepository.findById.mockResolvedValue(
      kind === "missing" ? null : withUserRoles(user, [makeRole(RoleType.SuperUser)])
    );

    for (const suffix of ["", `/${session.getId().getValue()}`]) {
      await request(app.getHttpServer()).delete(`${baseUrl}${suffix}`).expect(404);
    }

    expect(repository.revokeByIdAndUserId).not.toHaveBeenCalled();
    expect(repository.revokeAllByUserId).not.toHaveBeenCalled();
  });

  it("allows SUPERUSER to revoke all superuser sessions", async () => {
    auth = sessionAuth([RoleType.SuperUser]);
    userRepository.findById.mockResolvedValue(withUserRoles(user, [makeRole(RoleType.SuperUser)]));
    await request(app.getHttpServer()).delete(baseUrl).expect(204);
    expect(repository.revokeAllByUserId).toHaveBeenCalledWith(user.getId(), expect.any(Date));
  });

  it.each(["", "single"])(
    "clears the refresh cookie when revoking the administrator's own session(s): %s",
    async (kind) => {
      auth = {
        ...sessionAuth([RoleType.Admin]),
        userId: user.getId().getValue(),
        sessionId: session.getId().getValue(),
      };

      const response = await request(app.getHttpServer())
        .delete(kind === "single" ? `${baseUrl}/${session.getId().getValue()}` : baseUrl)
        .expect(204);
      expect(response.get("Set-Cookie")).toEqual([
        expect.stringMatching(/^refresh_token=;.*HttpOnly; SameSite=Strict$/),
      ]);
    }
  );
});
