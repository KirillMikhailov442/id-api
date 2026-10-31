import type { Server } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import { controllerApp, testSessionAuth } from "@shared/testing/controller-test.spec-support";
import request from "supertest";

import { AssignScopesCommand } from "@modules/oauth/application/command/assign-scopes.command";
import { CreateClientCommand } from "@modules/oauth/application/command/create-client.command";
import { DeleteClientCommand } from "@modules/oauth/application/command/delete-client.command";
import { UnassignScopeCommand } from "@modules/oauth/application/command/unassign-scope.command";
import { UpdateClientCommand } from "@modules/oauth/application/command/update-client.command";
import { makeClient, makeScope } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { GetClientQuery } from "@modules/oauth/application/query/get-client.query";
import { ListAllClientsQuery } from "@modules/oauth/application/query/list-all-clients.query";
import { ListClientScopesQuery } from "@modules/oauth/application/query/list-client-scopes.query";
import { ListClientsQuery } from "@modules/oauth/application/query/list-clients.query";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ScopeNotAssignedException } from "@modules/oauth/domain/exception/scope-not-assigned.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { ClientController } from "@modules/oauth/presentation/controller/v1/client.controller";

describe("ClientController (HTTP)", () => {
  let app: INestApplication<Server>;
  let auth: AuthContext | undefined;
  let client: ReturnType<typeof makeClient>;
  let scope: ReturnType<typeof makeScope>;
  const execute = jest.fn<Promise<unknown>, [unknown]>();
  const query = jest.fn<Promise<unknown>, [unknown]>();
  const actor = { userId: testSessionAuth.userId, roles: testSessionAuth.roles };
  const path = () => "/v1/clients/" + client.getId().getValue();
  const dto = () => ({
    id: client.getId().getValue(),
    userId: client.getUserId().getValue(),
    name: "Test client",
    location: null,
    isActive: true,
    createdAt: client.getCreatedAt().toISOString(),
  });
  const scopeDto = () => ({
    id: scope.getId().getValue(),
    name: "profile",
    createdAt: scope.getCreatedAt().toISOString(),
  });

  beforeAll(async () => {
    app = await controllerApp(
      ClientController,
      [
        { provide: CommandBus, useValue: { execute } },
        { provide: QueryBus, useValue: { execute: query } },
      ],
      () => auth
    );
  });

  beforeEach(() => {
    execute.mockReset();
    query.mockReset();
    auth = testSessionAuth;
    client = makeClient();
    scope = makeScope();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a client without exposing its secret hash", async () => {
    execute.mockResolvedValue(client);

    const response = await request(app.getHttpServer())
      .post("/v1/clients")
      .send({
        name: "Test client",
        secret: "test-client-secret",
        location: "https://app.example.com/callback",
        scopes: ["profile"],
      })
      .expect(201);
    expect(execute).toHaveBeenCalledWith(
      new CreateClientCommand(actor, "Test client", "test-client-secret", "https://app.example.com/callback", [
        "profile",
      ])
    );
    expect(response.body).toEqual(dto());
  });

  it("passes defaults for omitted optional creation fields", async () => {
    execute.mockResolvedValue(client);
    await request(app.getHttpServer())
      .post("/v1/clients")
      .send({ name: "Test client", secret: "test-client-secret" })
      .expect(201);
    expect(execute).toHaveBeenCalledWith(new CreateClientCommand(actor, "Test client", "test-client-secret"));
  });

  it("lists the requester's clients with pagination", async () => {
    query.mockResolvedValue({ items: [client], total: 12 });

    const response = await request(app.getHttpServer()).get("/v1/clients?limit=5&offset=10").expect(200);
    expect(query).toHaveBeenCalledWith(new ListClientsQuery(actor, 5, 10));
    expect(response.body).toEqual({ items: [dto()], meta: { total: 12, limit: 5, offset: 10 } });
  });

  it("lists all clients through the separate query", async () => {
    query.mockResolvedValue({ items: [client], total: 1 });

    const response = await request(app.getHttpServer()).get("/v1/clients/all").expect(200);
    expect(query).toHaveBeenCalledWith(new ListAllClientsQuery(20, 0));
    expect(response.body).toEqual({ items: [dto()], meta: { total: 1, limit: 20, offset: 0 } });
  });

  it("returns an empty page with pagination defaults", async () => {
    query.mockResolvedValue({ items: [], total: 0 });

    const response = await request(app.getHttpServer()).get("/v1/clients").expect(200);
    expect(query).toHaveBeenCalledWith(new ListClientsQuery(actor, 20, 0));
    expect(response.body).toEqual({ items: [], meta: { total: 0, limit: 20, offset: 0 } });
  });

  it("gets a client by UUID", async () => {
    query.mockResolvedValue(client);

    const response = await request(app.getHttpServer()).get(path()).expect(200);
    expect(query).toHaveBeenCalledWith(new GetClientQuery(actor, client.getId().getValue()));
    expect(response.body).toEqual(dto());
  });

  it("updates the supplied fields and preserves false isActive", async () => {
    execute.mockResolvedValue(client);

    const response = await request(app.getHttpServer())
      .patch(path())
      .send({ name: "Updated", isActive: false, location: "https://app.example.com/callback" })
      .expect(200);
    expect(execute).toHaveBeenCalledWith(
      new UpdateClientCommand(actor, client.getId().getValue(), "Updated", false, "https://app.example.com/callback")
    );
    expect(response.body).toEqual(dto());
  });

  it("passes undefined for omitted update fields", async () => {
    execute.mockResolvedValue(client);
    await request(app.getHttpServer()).patch(path()).send({ name: "Updated" }).expect(200);
    expect(execute).toHaveBeenCalledWith(new UpdateClientCommand(actor, client.getId().getValue(), "Updated"));
  });

  it("deletes a client with an empty response", async () => {
    execute.mockResolvedValue(client);

    const response = await request(app.getHttpServer()).delete(path()).expect(204);
    expect(execute).toHaveBeenCalledWith(new DeleteClientCommand(actor, client.getId().getValue()));
    expect(response.text).toBe("");
  });

  it.each([false, true])("lists client scopes, empty=%s", async (empty) => {
    query.mockResolvedValue(empty ? [] : [scope]);

    const response = await request(app.getHttpServer())
      .get(path() + "/scopes")
      .expect(200);
    expect(query).toHaveBeenCalledWith(new ListClientScopesQuery(actor, client.getId().getValue()));
    expect(response.body).toEqual(empty ? [] : [scopeDto()]);
  });

  it("assigns the requested scopes", async () => {
    execute.mockResolvedValue([scope]);

    const response = await request(app.getHttpServer())
      .put(path() + "/scopes")
      .send({ scopes: ["profile"] })
      .expect(200);
    expect(execute).toHaveBeenCalledWith(new AssignScopesCommand(actor, client.getId().getValue(), ["profile"]));
    expect(response.body).toEqual([scopeDto()]);
  });

  it("passes the decoded scope name to unassignment", async () => {
    execute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .delete(path() + "/scopes/user%3Aread")
      .expect(204);
    expect(execute).toHaveBeenCalledWith(new UnassignScopeCommand(actor, client.getId().getValue(), "user:read"));
    expect(response.text).toBe("");
  });

  it.each([
    { method: "get", suffix: "" },
    { method: "patch", suffix: "" },
    { method: "delete", suffix: "" },
    { method: "get", suffix: "/scopes" },
    { method: "put", suffix: "/scopes" },
    { method: "delete", suffix: "/scopes/profile" },
  ] as const)("rejects invalid client UUID for $method $suffix", async ({ method, suffix }) => {
    const http = request(app.getHttpServer());
    await http[method]("/v1/clients/invalid" + suffix)
      .send({ name: "Updated", scopes: ["profile"] })
      .expect(400);
    expect(execute).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it.each([
    { name: "missing name", body: { secret: "test-client-secret" } },
    { name: "short secret", body: { name: "Client", secret: "short" } },
    { name: "invalid location", body: { name: "Client", secret: "test-client-secret", location: "relative" } },
    { name: "invalid scopes", body: { name: "Client", secret: "test-client-secret", scopes: ["invalid scope"] } },
  ])("rejects create with $name", async ({ body }) => {
    await request(app.getHttpServer()).post("/v1/clients").send(body).expect(422);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([{ isActive: "false" }, { location: null }, { name: "" }, { location: "relative" }])(
    "rejects invalid update body %j",
    async (body) => {
      await request(app.getHttpServer()).patch(path()).send(body).expect(422);
      expect(execute).not.toHaveBeenCalled();
    }
  );

  it.each([{}, { scopes: [] }, { scopes: "profile" }, { scopes: ["invalid scope"] }])(
    "rejects invalid assignment body %j",
    async (body) => {
      await request(app.getHttpServer())
        .put(path() + "/scopes")
        .send(body)
        .expect(422);
      expect(execute).not.toHaveBeenCalled();
    }
  );

  it.each(["limit=0", "offset=-1", "limit=101"])("rejects invalid pagination %s", async (params) => {
    await request(app.getHttpServer())
      .get("/v1/clients?" + params)
      .expect(422);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns 404 when the query denies client access", async () => {
    query.mockRejectedValue(new ClientNotFoundException());

    const response = await request(app.getHttpServer()).get(path()).expect(404);
    expect(response.body).toMatchObject({ code: "CLIENT_NOT_FOUND" });
  });

  it("returns 404 for an unknown scope during assignment", async () => {
    execute.mockRejectedValue(new ScopeNotFoundException());

    const response = await request(app.getHttpServer())
      .put(path() + "/scopes")
      .send({ scopes: ["profile"] })
      .expect(404);
    expect(response.body).toMatchObject({ code: "SCOPE_NOT_FOUND" });
  });

  it("returns an error when removing an unassigned scope", async () => {
    const error = new ScopeNotAssignedException();
    execute.mockRejectedValue(error);

    const response = await request(app.getHttpServer())
      .delete(path() + "/scopes/profile")
      .expect(error.status);
    expect(response.body).toMatchObject({ code: error.code });
  });

  it.each(["get", "delete"] as const)("rejects missing current user for %s", async (method) => {
    auth = undefined;
    await request(app.getHttpServer())[method](path()).expect(401);
    expect(execute).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
