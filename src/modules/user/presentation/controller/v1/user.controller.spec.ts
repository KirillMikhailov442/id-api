import type { Server } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { controllerApp, testSessionAuth } from "@shared/testing/controller-test.spec-support";
import request from "supertest";

import { LoginCommand } from "@modules/session/application/command/login.command";
import { DeviceInfoParser } from "@modules/session/device-info.module";
import { AssignUserRoleCommand } from "@modules/user/application/command/assign-user-role.command";
import { BlockUserCommand } from "@modules/user/application/command/block-user.command";
import { ChangePasswordCommand } from "@modules/user/application/command/change-password.command";
import { ConfirmEmailCommand } from "@modules/user/application/command/confirm-email.command";
import { CreateUserCommand } from "@modules/user/application/command/create-user.command";
import { DeleteUserCommand } from "@modules/user/application/command/delete-user.command";
import { RemoveUserRoleCommand } from "@modules/user/application/command/remove-user-role.command";
import { UnblockUserCommand } from "@modules/user/application/command/unblock-user.command";
import { UpdateUserCommand } from "@modules/user/application/command/update-user.command";
import { makeRole, makeUser } from "@modules/user/application/handler/user-test.spec-support";
import { ProfileAccessPolicy } from "@modules/user/application/profile-access.policy";
import { GetCurrentUserQuery } from "@modules/user/application/query/get-current-user.query";
import { GetUserQuery } from "@modules/user/application/query/get-user.query";
import { ListUsersQuery } from "@modules/user/application/query/list-users.query";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { EmailAlreadyRegisteredException } from "@modules/user/domain/exception/email-already-registered.exception";
import { InvalidEmailConfirmationTokenException } from "@modules/user/domain/exception/invalid-email-confirmation-token.exception";
import { InvalidOldPasswordException } from "@modules/user/domain/exception/invalid-old-password.exception";
import { UserNotFoundException } from "@modules/user/domain/exception/user-not-found.exception";
import { UserRoleChangeForbiddenException } from "@modules/user/domain/exception/user-role-change-forbidden.exception";
import { UserController } from "@modules/user/presentation/controller/v1/user.controller";

describe("UserController (HTTP)", () => {
  let app: INestApplication<Server>;
  let auth: AuthContext | undefined;
  let user: ReturnType<typeof makeUser>;
  const execute = jest.fn<Promise<unknown>, [unknown]>();
  const query = jest.fn<Promise<unknown>, [unknown]>();
  const parse = jest.fn();
  const deviceInfo = { browser: null, os: null, deviceType: null };
  const registration = { name: "Ivan", surname: "Ivanov", email: "ivan@example.com", password: "S3cureP@ssw0rd" };
  const profileBody = { name: "Petr", surname: "Petrov", email: "new@example.com" };
  const dto = () => ({
    id: user.getId().getValue(),
    name: "Ivan",
    surname: "Ivanov",
    email: "ivan@example.com",
    avatar: user.getAvatar(),
    roles: [RoleType.User],
    emailConfirmed: false,
    blocked: false,
    createdAt: user.getCreatedAt().toISOString(),
    updatedAt: user.getUpdatedAt().toISOString(),
  });
  const profileDto = () => ({ id: user.getId().getValue(), name: "Ivan", surname: "Ivanov", avatar: user.getAvatar() });
  const path = () => "/v1/users/" + user.getId().getValue();
  const oauthAuth = (): AuthContext => ({
    type: AccessTokenType.OAuth,
    userId: user.getId().getValue(),
    clientId: "00000000-0000-4000-8000-000000000003",
    grantId: "00000000-0000-4000-8000-000000000004",
    scopes: ["user:read", "user:write"],
  });

  beforeAll(async () => {
    app = await controllerApp(
      UserController,
      [
        { provide: CommandBus, useValue: { execute } },
        { provide: QueryBus, useValue: { execute: query } },
        { provide: ConfigService, useValue: new ConfigService({ NODE_ENV: "test", REFRESH_TOKEN_TTL: 3600 }) },
        { provide: DeviceInfoParser, useValue: { parse } },
        ProfileAccessPolicy,
      ],
      () => auth
    );
  });

  beforeEach(() => {
    execute.mockReset();
    query.mockReset();
    parse.mockReset();
    parse.mockReturnValue(deviceInfo);
    user = makeUser();
    user.assignRole(makeRole(RoleType.User));
    auth = { ...testSessionAuth, userId: user.getId().getValue() };
  });

  afterAll(async () => {
    await app.close();
  });

  for (const method of ["put", "delete"] as const) {
    it(`dispatches ${method} role changes using trusted requester roles`, async () => {
      const roleId = "00000000-0000-4000-8000-000000000005";
      auth = { ...testSessionAuth, roles: [RoleType.SuperUser] };
      execute.mockResolvedValue(undefined);
      const response = await request(app.getHttpServer())
        [method](path() + "/roles/" + roleId)
        .send({ requesterRoles: [RoleType.Admin] })
        .expect(204);
      const expected =
        method === "put"
          ? new AssignUserRoleCommand(user.getId().getValue(), roleId, [RoleType.SuperUser])
          : new RemoveUserRoleCommand(user.getId().getValue(), roleId, [RoleType.SuperUser]);
      expect(execute).toHaveBeenCalledWith(expected);
      expect(response.text).toBe("");
    });

    it.each([
      "invalid/roles/00000000-0000-4000-8000-000000000005",
      "00000000-0000-4000-8000-000000000001/roles/invalid",
    ])(`validates UUIDs on ${method} %s`, async (suffix) => {
      await request(app.getHttpServer())
        [method]("/v1/users/" + suffix)
        .expect(400);
      expect(execute).not.toHaveBeenCalled();
    });

    it(`returns 403 for forbidden ${method} role changes`, async () => {
      execute.mockRejectedValue(new UserRoleChangeForbiddenException());
      const response = await request(app.getHttpServer())
        [method](path() + "/roles/00000000-0000-4000-8000-000000000005")
        .expect(403);
      expect(response.body).toMatchObject({ status: 403, code: "USER_ROLE_CHANGE_FORBIDDEN" });
    });
  }

  it("creates a user, logs in and sets an HttpOnly refresh cookie", async () => {
    execute.mockResolvedValueOnce(user).mockResolvedValueOnce({ accessToken: "access", refreshToken: "refresh" });

    const response = await request(app.getHttpServer())
      .post("/v1/users")
      .set("User-Agent", "test-browser")
      .send(registration)
      .expect(201);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      new CreateUserCommand("Ivan", "Ivanov", "ivan@example.com", "S3cureP@ssw0rd")
    );
    expect(execute).toHaveBeenNthCalledWith(2, expect.any(LoginCommand));
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        email: registration.email,
        password: registration.password,
        deviceInfo,
        ip: expect.any(String) as unknown,
      })
    );
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ "user-agent": "test-browser" }));
    expect(response.body).toEqual({ user: dto(), accessToken: "access" });
    expect(response.get("Set-Cookie")).toEqual([
      expect.stringMatching(/^refresh_token=refresh;.*HttpOnly; SameSite=Strict$/) as unknown,
    ]);
  });

  it("does not log in or set a cookie if registration fails", async () => {
    execute.mockRejectedValue(new EmailAlreadyRegisteredException());

    const response = await request(app.getHttpServer()).post("/v1/users").send(registration).expect(409);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(parse).not.toHaveBeenCalled();
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it("does not set a cookie if automatic login fails", async () => {
    execute.mockResolvedValueOnce(user).mockRejectedValueOnce(new UserNotFoundException());

    const response = await request(app.getHttpServer()).post("/v1/users").send(registration).expect(404);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(response.get("Set-Cookie")).toBeUndefined();
  });

  it.each([
    { name: "missing name", body: { surname: "Ivanov", email: "ivan@example.com", password: "S3cureP@ssw0rd" } },
    { name: "invalid email", body: { ...registration, email: "invalid" } },
    { name: "weak password", body: { ...registration, password: "weak" } },
  ])("rejects registration with $name before executing commands", async ({ body }) => {
    await request(app.getHttpServer()).post("/v1/users").send(body).expect(422);
    expect(execute).not.toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();
  });

  it("lists users with pagination and public DTOs", async () => {
    query.mockResolvedValue({ items: [user], total: 12 });

    const response = await request(app.getHttpServer()).get("/v1/users?limit=5&offset=10").expect(200);
    expect(query).toHaveBeenCalledWith(new ListUsersQuery(5, 10));
    expect(response.body).toEqual({ items: [dto()], meta: { total: 12, limit: 5, offset: 10 } });
  });

  it("returns an empty page with defaults", async () => {
    query.mockResolvedValue({ items: [], total: 0 });

    const response = await request(app.getHttpServer()).get("/v1/users").expect(200);
    expect(query).toHaveBeenCalledWith(new ListUsersQuery(20, 0));
    expect(response.body).toEqual({ items: [], meta: { total: 0, limit: 20, offset: 0 } });
  });

  it("gets a user by UUID", async () => {
    query.mockResolvedValue(user);

    const response = await request(app.getHttpServer()).get(path()).expect(200);
    expect(query).toHaveBeenCalledWith(new GetUserQuery(user.getId().getValue()));
    expect(response.body).toEqual(dto());
  });

  it("forwards trusted session roles when listing and retrieving users", async () => {
    auth = { ...testSessionAuth, roles: [RoleType.SuperUser] };
    query.mockResolvedValueOnce({ items: [user], total: 1 }).mockResolvedValueOnce(user);

    await request(app.getHttpServer()).get("/v1/users?requesterRoles=SUPERUSER").expect(200);
    expect(query).toHaveBeenNthCalledWith(1, new ListUsersQuery(20, 0, [RoleType.SuperUser]));
    await request(app.getHttpServer()).get(path()).expect(200);
    expect(query).toHaveBeenNthCalledWith(2, new GetUserQuery(user.getId().getValue(), [RoleType.SuperUser]));
  });

  it("does not use query parameters as requester roles", async () => {
    query.mockResolvedValueOnce({ items: [], total: 0 }).mockResolvedValueOnce(user);
    await request(app.getHttpServer()).get("/v1/users?requesterRoles=SUPERUSER").expect(200);
    expect(query).toHaveBeenNthCalledWith(1, new ListUsersQuery(20, 0, []));
    await request(app.getHttpServer())
      .get(path() + "?requesterRoles=SUPERUSER")
      .expect(200);
    expect(query).toHaveBeenNthCalledWith(2, new GetUserQuery(user.getId().getValue(), []));
  });

  it("returns the full account DTO for the current session", async () => {
    query.mockResolvedValue(user);

    const response = await request(app.getHttpServer()).get("/v1/users/me").expect(200);
    expect(query).toHaveBeenCalledWith(new GetCurrentUserQuery(user.getId().getValue()));
    expect(response.body).toEqual(dto());
  });

  it("returns only profile fields for OAuth callers", async () => {
    auth = oauthAuth();
    query.mockResolvedValue(user);

    const response = await request(app.getHttpServer()).get("/v1/users/me").expect(200);
    expect(query).toHaveBeenCalledWith(new GetCurrentUserQuery(user.getId().getValue()));
    expect(response.body).toEqual(profileDto());
  });

  it("updates the current account including email for session callers", async () => {
    execute.mockResolvedValue(user);

    const response = await request(app.getHttpServer()).patch("/v1/users/me").send(profileBody).expect(200);
    expect(execute).toHaveBeenCalledWith(
      new UpdateUserCommand(user.getId().getValue(), "Petr", "Petrov", "new@example.com")
    );
    expect(response.body).toEqual(dto());
  });

  it("updates only the supplied OAuth profile fields and returns limited data", async () => {
    auth = oauthAuth();
    execute.mockResolvedValue(user);

    const response = await request(app.getHttpServer()).patch("/v1/users/me").send({ name: "Petr" }).expect(200);
    expect(execute).toHaveBeenCalledWith(new UpdateUserCommand(user.getId().getValue(), "Petr"));
    expect(response.body).toEqual(profileDto());
  });

  it("rejects OAuth email changes before executing a command", async () => {
    auth = oauthAuth();
    await request(app.getHttpServer()).patch("/v1/users/me").send({ email: "new@example.com" }).expect(403);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([{}, { roles: ["ADMIN"] }])("rejects empty or unsupported self updates %j", async (body) => {
    await request(app.getHttpServer()).patch("/v1/users/me").send(body).expect(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects null profile fields", async () => {
    await request(app.getHttpServer()).patch("/v1/users/me").send({ name: null }).expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it("changes the password and returns no content", async () => {
    execute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .patch("/v1/users/me/password")
      .send({ oldPassword: "old", newPassword: "N3wP@ssword" })
      .expect(204);
    expect(execute).toHaveBeenCalledWith(new ChangePasswordCommand(user.getId().getValue(), "old", "N3wP@ssword"));
    expect(response.text).toBe("");
  });

  it.each([
    { oldPassword: "old" },
    { oldPassword: "SameP@ss1", newPassword: "SameP@ss1" },
    { oldPassword: "old", newPassword: "weak" },
  ])("rejects invalid password change %j", async (body) => {
    await request(app.getHttpServer()).patch("/v1/users/me/password").send(body).expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns the old-password error from the handler", async () => {
    const error = new InvalidOldPasswordException();
    execute.mockRejectedValue(error);

    const response = await request(app.getHttpServer())
      .patch("/v1/users/me/password")
      .send({ oldPassword: "old", newPassword: "N3wP@ssword" })
      .expect(error.status);
    expect(response.body).toMatchObject({ code: error.code });
  });

  it("confirms email using the query token", async () => {
    execute.mockResolvedValue(user);

    const response = await request(app.getHttpServer()).get("/v1/users/confirm-email?token=confirmation").expect(200);
    expect(execute).toHaveBeenCalledWith(new ConfirmEmailCommand("confirmation"));
    expect(response.body).toEqual(dto());
  });

  it.each(["", "?token="])("rejects a missing or empty confirmation token %s", async (suffix) => {
    await request(app.getHttpServer())
      .get("/v1/users/confirm-email" + suffix)
      .expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns invalid confirmation-token errors", async () => {
    const error = new InvalidEmailConfirmationTokenException();
    execute.mockRejectedValue(error);

    const response = await request(app.getHttpServer())
      .get("/v1/users/confirm-email?token=invalid")
      .expect(error.status);
    expect(response.body).toMatchObject({ code: error.code });
  });

  it("updates a user by UUID", async () => {
    execute.mockResolvedValue(user);

    const response = await request(app.getHttpServer()).put(path()).send(profileBody).expect(200);
    expect(execute).toHaveBeenCalledWith(
      new UpdateUserCommand(user.getId().getValue(), "Petr", "Petrov", "new@example.com")
    );
    expect(response.body).toEqual(dto());
  });

  it("validates full admin update bodies", async () => {
    await request(app.getHttpServer()).put(path()).send({ name: "Petr" }).expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it("deletes a user", async () => {
    execute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer()).delete(path()).expect(204);
    expect(execute).toHaveBeenCalledWith(new DeleteUserCommand(user.getId().getValue()));
    expect(response.text).toBe("");
  });

  it.each(["abuse", undefined])("blocks a user with optional reason %s", async (reason) => {
    execute.mockResolvedValue(user);

    const httpRequest = request(app.getHttpServer()).patch(path() + "/block");

    if (reason !== undefined) {
      httpRequest.send({ reason });
    }

    const response = await httpRequest.expect(200);
    expect(execute).toHaveBeenCalledWith(new BlockUserCommand(user.getId().getValue(), reason));
    expect(response.body).toEqual(dto());
  });

  it("rejects an invalid blocking reason", async () => {
    await request(app.getHttpServer())
      .patch(path() + "/block")
      .send({ reason: 123 })
      .expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it("unblocks a user", async () => {
    execute.mockResolvedValue(user);

    const response = await request(app.getHttpServer())
      .patch(path() + "/unblock")
      .expect(200);
    expect(execute).toHaveBeenCalledWith(new UnblockUserCommand(user.getId().getValue()));
    expect(response.body).toEqual(dto());
  });

  it.each([
    { method: "get", suffix: "" },
    { method: "put", suffix: "" },
    { method: "delete", suffix: "" },
    { method: "patch", suffix: "/block" },
    { method: "patch", suffix: "/unblock" },
  ] as const)("rejects invalid UUIDs for $method $suffix", async ({ method, suffix }) => {
    const http = request(app.getHttpServer());
    await http[method]("/v1/users/invalid" + suffix)
      .send(profileBody)
      .expect(400);
    expect(execute).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it.each(["limit=0", "limit=101", "offset=-1"])("rejects invalid pagination %s", async (params) => {
    await request(app.getHttpServer())
      .get("/v1/users?" + params)
      .expect(422);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns a missing-user error", async () => {
    query.mockRejectedValue(new UserNotFoundException());

    const response = await request(app.getHttpServer()).get(path()).expect(404);
    expect(response.body).toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it.each(["get", "patch"] as const)("rejects a missing auth context for %s me", async (method) => {
    auth = undefined;
    await request(app.getHttpServer())[method]("/v1/users/me").send({ name: "Petr" }).expect(401);
    expect(execute).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects password changes without a session user", async () => {
    auth = undefined;
    await request(app.getHttpServer())
      .patch("/v1/users/me/password")
      .send({ oldPassword: "old", newPassword: "N3wP@ssword" })
      .expect(401);
    expect(execute).not.toHaveBeenCalled();
  });
});
