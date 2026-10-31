import type { Server } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { controllerApp } from "@shared/testing/controller-test.spec-support";
import request from "supertest";

import { CreateScopeCommand } from "@modules/oauth/application/command/create-scope.command";
import { makeScope } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ListScopesQuery } from "@modules/oauth/application/query/list-scopes.query";
import { ScopeAlreadyExistsException } from "@modules/oauth/domain/exception/scope-already-exists.exception";
import { ScopeController } from "@modules/oauth/presentation/controller/v1/scope.controller";

describe("ScopeController (HTTP)", () => {
  let app: INestApplication<Server>;
  let scope: ReturnType<typeof makeScope>;
  const execute = jest.fn<Promise<unknown>, [unknown]>();
  const query = jest.fn<Promise<unknown>, [unknown]>();
  const dto = () => ({
    id: scope.getId().getValue(),
    name: scope.getName().getValue(),
    createdAt: scope.getCreatedAt().toISOString(),
  });

  beforeAll(async () => {
    app = await controllerApp(ScopeController, [
      { provide: CommandBus, useValue: { execute } },
      { provide: QueryBus, useValue: { execute: query } },
    ]);
  });

  beforeEach(() => {
    execute.mockReset();
    query.mockReset();
    scope = makeScope();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a scope", async () => {
    execute.mockResolvedValue(scope);

    const response = await request(app.getHttpServer()).post("/v1/scopes").send({ name: "profile" }).expect(201);
    expect(execute).toHaveBeenCalledWith(new CreateScopeCommand("profile"));
    expect(response.body).toEqual(dto());
  });

  it("lists scopes with numeric pagination", async () => {
    query.mockResolvedValue({ items: [scope], total: 12 });

    const response = await request(app.getHttpServer()).get("/v1/scopes?limit=5&offset=10").expect(200);
    expect(query).toHaveBeenCalledWith(new ListScopesQuery(5, 10));
    expect(response.body).toEqual({ items: [dto()], meta: { total: 12, limit: 5, offset: 10 } });
  });

  it("uses default pagination for an empty list", async () => {
    query.mockResolvedValue({ items: [], total: 0 });

    const response = await request(app.getHttpServer()).get("/v1/scopes").expect(200);
    expect(query).toHaveBeenCalledWith(new ListScopesQuery(20, 0));
    expect(response.body).toEqual({ items: [], meta: { total: 0, limit: 20, offset: 0 } });
  });

  it.each([{}, { name: "" }, { name: "invalid scope" }, { name: 123 }])(
    "rejects invalid scope bodies %j",
    async (body) => {
      await request(app.getHttpServer()).post("/v1/scopes").send(body).expect(422);
      expect(execute).not.toHaveBeenCalled();
    }
  );

  it.each(["limit=0", "limit=101", "offset=-1", "limit=abc"])("rejects invalid pagination %s", async (params) => {
    await request(app.getHttpServer())
      .get("/v1/scopes?" + params)
      .expect(422);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns a duplicate scope error", async () => {
    execute.mockRejectedValue(new ScopeAlreadyExistsException());

    const response = await request(app.getHttpServer()).post("/v1/scopes").send({ name: "profile" }).expect(409);
    expect(response.body).toMatchObject({ code: "SCOPE_ALREADY_EXISTS" });
  });
});
