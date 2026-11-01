import type { Server } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { controllerApp } from "@shared/testing/controller-test.spec-support";
import request from "supertest";

import { CreateRoleCommand } from "@modules/user/application/command/create-role.command";
import { DeleteRoleCommand } from "@modules/user/application/command/delete-role.command";
import { UpdateRoleCommand } from "@modules/user/application/command/update-role.command";
import { makeRole } from "@modules/user/application/handler/user-test.spec-support";
import { GetRoleQuery } from "@modules/user/application/query/get-role.query";
import { ListRolesQuery } from "@modules/user/application/query/list-roles.query";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { ProtectedRoleException } from "@modules/user/domain/exception/protected-role.exception";
import { RoleAlreadyExistsException } from "@modules/user/domain/exception/role-already-exists.exception";
import { RoleNotFoundException } from "@modules/user/domain/exception/role-not-found.exception";
import { RoleController } from "@modules/user/presentation/controller/v1/role.controller";

describe("RoleController (HTTP)", () => {
  let app: INestApplication<Server>;
  let role: ReturnType<typeof makeRole>;
  const execute = jest.fn<Promise<unknown>, [unknown]>();
  const query = jest.fn<Promise<unknown>, [unknown]>();
  const dto = () => ({
    id: role.getId().getValue(),
    name: role.getName().getValue(),
    createdAt: role.getCreatedAt().toISOString(),
  });

  beforeAll(async () => {
    app = await controllerApp(RoleController, [
      { provide: CommandBus, useValue: { execute } },
      { provide: QueryBus, useValue: { execute: query } },
    ]);
  });

  beforeEach(() => {
    execute.mockReset();
    query.mockReset();
    role = makeRole(RoleType.User);
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a role and returns its public DTO", async () => {
    execute.mockResolvedValue(role);

    const response = await request(app.getHttpServer()).post("/v1/roles").send({ name: RoleType.User }).expect(201);
    expect(execute).toHaveBeenCalledWith(new CreateRoleCommand(RoleType.User));
    expect(response.body).toEqual(dto());
  });

  it.each([false, true])("lists roles, empty=%s", async (empty) => {
    query.mockResolvedValue(empty ? [] : [role]);

    const response = await request(app.getHttpServer()).get("/v1/roles").expect(200);
    expect(query).toHaveBeenCalledWith(new ListRolesQuery());
    expect(response.body).toEqual(empty ? [] : [dto()]);
  });

  it("gets a role by UUID", async () => {
    query.mockResolvedValue(role);

    const response = await request(app.getHttpServer())
      .get("/v1/roles/" + role.getId().getValue())
      .expect(200);
    expect(query).toHaveBeenCalledWith(new GetRoleQuery(role.getId().getValue()));
    expect(response.body).toEqual(dto());
  });

  it("updates a role", async () => {
    role = makeRole(RoleType.Admin);
    execute.mockResolvedValue(role);

    const response = await request(app.getHttpServer())
      .put("/v1/roles/" + role.getId().getValue())
      .send({ name: RoleType.Admin })
      .expect(200);
    expect(execute).toHaveBeenCalledWith(new UpdateRoleCommand(role.getId().getValue(), RoleType.Admin));
    expect(response.body).toEqual(dto());
  });

  it("deletes a role with an empty response", async () => {
    execute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .delete("/v1/roles/" + role.getId().getValue())
      .expect(204);
    expect(execute).toHaveBeenCalledWith(new DeleteRoleCommand(role.getId().getValue()));
    expect(response.text).toBe("");
  });

  it.each(["get", "put", "delete"] as const)("rejects invalid UUIDs for %s", async (method) => {
    const http = request(app.getHttpServer());
    const response = await http[method]("/v1/roles/invalid").send({ name: RoleType.User }).expect(400);
    expect(response.body).toMatchObject({ code: "BAD_REQUEST" });
    expect(execute).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it.each([{}, { name: "unknown" }, { name: 123 }])("rejects invalid create bodies %j", async (body) => {
    await request(app.getHttpServer()).post("/v1/roles").send(body).expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it("validates update bodies", async () => {
    await request(app.getHttpServer())
      .put("/v1/roles/" + role.getId().getValue())
      .send({ name: "unknown" })
      .expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(["get", "put", "delete"] as const)("returns 404 from %s", async (method) => {
    query.mockRejectedValue(new RoleNotFoundException());
    execute.mockRejectedValue(new RoleNotFoundException());

    const http = request(app.getHttpServer());
    const response = await http[method]("/v1/roles/" + role.getId().getValue())
      .send({ name: RoleType.User })
      .expect(404);
    expect(response.body).toMatchObject({ status: 404, code: "ROLE_NOT_FOUND" });
  });

  it.each(["put", "delete"] as const)("returns 403 for a protected role on %s", async (method) => {
    execute.mockRejectedValue(new ProtectedRoleException());
    const response = await request(app.getHttpServer())
      [method]("/v1/roles/" + role.getId().getValue())
      .send({ name: RoleType.Admin })
      .expect(403);
    expect(response.body).toMatchObject({ status: 403, code: "PROTECTED_ROLE" });
  });

  it.each(["post", "put"] as const)("returns 409 for duplicate roles on %s", async (method) => {
    execute.mockRejectedValue(new RoleAlreadyExistsException());

    const path = "/v1/roles" + (method === "put" ? "/" + role.getId().getValue() : "");
    const response = await request(app.getHttpServer())[method](path).send({ name: RoleType.User }).expect(409);
    expect(response.body).toMatchObject({ code: "ROLE_ALREADY_EXISTS" });
  });
});
