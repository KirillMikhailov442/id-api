import type { Server } from "node:http";
import { NotFoundException, type INestApplication } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import { controllerApp, testSessionAuth } from "@shared/testing/controller-test.spec-support";
import { mockFn } from "@shared/testing/handler-test.spec-support";
import request from "supertest";

import type { OAuthGrantPage, OAuthGrantSummary } from "@modules/oauth/application/port/oauth-grant-store";
import { ListOAuthGrantsQuery } from "@modules/oauth/application/query/list-oauth-grants.query";
import { OAuthGrantRevocationService } from "@modules/oauth/application/service/oauth-grant-revocation.service";
import { ClientId, OAuthGrantId } from "@modules/oauth/oauth.ids";
import { OAuthGrantsController } from "@modules/oauth/presentation/controller/v1/oauth-grants.controller";
import { UserId } from "@modules/user/user.ids";

describe("OAuthGrantsController (HTTP)", () => {
  let app: INestApplication<Server>;
  let auth: AuthContext | undefined;
  const query = jest.fn<Promise<OAuthGrantPage>, [ListOAuthGrantsQuery]>();
  const revoke = mockFn<OAuthGrantRevocationService["revoke"]>();
  const revokeAsAdmin = mockFn<OAuthGrantRevocationService["revokeAsAdmin"]>();
  const grantId = OAuthGrantId.create();
  const clientId = ClientId.create();
  const summary: OAuthGrantSummary = {
    id: grantId,
    clientId,
    clientName: "Calendar",
    scopes: ["profile"],
    createdAt: new Date("2020-01-01"),
    expiresAt: new Date("2100-01-01"),
    revokedAt: null,
  };
  const grantDto = {
    id: grantId.getValue(),
    clientId: clientId.getValue(),
    clientName: "Calendar",
    scopes: ["profile"],
    createdAt: "2020-01-01T00:00:00.000Z",
    expiresAt: "2100-01-01T00:00:00.000Z",
    revokedAt: null,
    status: "active",
  };

  beforeAll(async () => {
    app = await controllerApp(
      OAuthGrantsController,
      [
        { provide: QueryBus, useValue: { execute: query } },
        { provide: OAuthGrantRevocationService, useValue: { revoke, revokeAsAdmin } },
      ],
      () => auth
    );
  });

  beforeEach(() => {
    query.mockReset();
    revoke.mockReset();
    revokeAsAdmin.mockReset();
    auth = testSessionAuth;
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists own grants with public fields and pagination", async () => {
    query.mockResolvedValue({ items: [summary], total: 12 });

    const response = await request(app.getHttpServer()).get("/v1/oauth/grants/me?limit=5&offset=10").expect(200);
    expect(query).toHaveBeenCalledWith(new ListOAuthGrantsQuery(testSessionAuth.userId, 5, 10));
    expect(response.body).toEqual({ items: [grantDto], meta: { total: 12, limit: 5, offset: 10 } });
  });

  it("lists the requested user's grants through the admin route", async () => {
    const userId = UserId.create();
    query.mockResolvedValue({ items: [], total: 0 });

    const response = await request(app.getHttpServer())
      .get("/v1/oauth/grants/" + userId.getValue())
      .expect(200);
    expect(query).toHaveBeenCalledWith(new ListOAuthGrantsQuery(userId.getValue(), 20, 0));
    expect(response.body).toEqual({ items: [], meta: { total: 0, limit: 20, offset: 0 } });
  });

  it("serializes active, expired and revoked grant statuses", async () => {
    query.mockResolvedValue({
      items: [
        summary,
        { ...summary, expiresAt: new Date("2000-01-01") },
        { ...summary, revokedAt: new Date("2020-02-01") },
      ],
      total: 3,
    });

    const response = await request(app.getHttpServer()).get("/v1/oauth/grants/me").expect(200);
    expect(response.body).toEqual({
      items: [
        grantDto,
        { ...grantDto, expiresAt: "2000-01-01T00:00:00.000Z", status: "expired" },
        { ...grantDto, revokedAt: "2020-02-01T00:00:00.000Z", status: "revoked" },
      ],
      meta: { total: 3, limit: 20, offset: 0 },
    });
  });

  it("revokes own grant with typed owner and grant IDs", async () => {
    revoke.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .delete("/v1/oauth/grants/" + grantId.getValue() + "/me")
      .expect(204);
    expect(revoke).toHaveBeenCalledWith(UserId.from(testSessionAuth.userId), grantId);
    expect(revokeAsAdmin).not.toHaveBeenCalled();
    expect(response.text).toBe("");
  });

  it("uses the admin revocation method", async () => {
    revokeAsAdmin.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .delete("/v1/oauth/grants/" + grantId.getValue())
      .expect(204);
    expect(revokeAsAdmin).toHaveBeenCalledWith(grantId);
    expect(revoke).not.toHaveBeenCalled();
    expect(response.text).toBe("");
  });

  it.each([
    { method: "get", suffix: "" },
    { method: "delete", suffix: "" },
    { method: "delete", suffix: "/me" },
  ] as const)("rejects invalid UUIDs for $method $suffix", async ({ method, suffix }) => {
    const http = request(app.getHttpServer());
    await http[method]("/v1/oauth/grants/invalid" + suffix).expect(400);
    expect(query).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
    expect(revokeAsAdmin).not.toHaveBeenCalled();
  });

  it.each(["limit=0", "limit=101", "offset=-1"])("rejects invalid pagination %s", async (params) => {
    await request(app.getHttpServer())
      .get("/v1/oauth/grants/me?" + params)
      .expect(422);
    expect(query).not.toHaveBeenCalled();
  });

  it.each(["", "/me"])("returns 404 for unknown or inaccessible grants via %s", async (suffix) => {
    revoke.mockRejectedValue(new NotFoundException("OAuth grant not found"));
    revokeAsAdmin.mockRejectedValue(new NotFoundException("OAuth grant not found"));

    const response = await request(app.getHttpServer())
      .delete("/v1/oauth/grants/" + grantId.getValue() + suffix)
      .expect(404);
    expect(response.body).toMatchObject({ code: "NOT_FOUND", message: "OAuth grant not found" });
  });

  it("returns 404 for a missing user during listing", async () => {
    query.mockRejectedValue(new NotFoundException("User not found"));
    await request(app.getHttpServer())
      .get("/v1/oauth/grants/" + testSessionAuth.userId)
      .expect(404);
  });

  it("requires a current user to list own grants", async () => {
    auth = undefined;
    await request(app.getHttpServer()).get("/v1/oauth/grants/me").expect(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("requires a current user to revoke own grants", async () => {
    auth = undefined;
    await request(app.getHttpServer())
      .delete("/v1/oauth/grants/" + grantId.getValue() + "/me")
      .expect(401);
    expect(revoke).not.toHaveBeenCalled();
  });
});
