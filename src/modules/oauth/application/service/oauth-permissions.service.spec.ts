import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { makeScope } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { OAuthPermissionsService } from "@modules/oauth/application/service/oauth-permissions.service";
import { serviceFixture } from "@modules/oauth/application/service/oauth-service-test.spec-support";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";
import { userRepositories } from "@modules/user/application/handler/user-test.spec-support";
import { USER_REPOSITORY } from "@modules/user/user.tokens";

describe("OAuthPermissionsService", () => {
  let fixture: ReturnType<typeof serviceFixture>;
  let users: ReturnType<typeof userRepositories>["userRepository"];
  let service: OAuthPermissionsService;
  let assignments: ClientScope[];

  beforeEach(async () => {
    fixture = serviceFixture();
    users = userRepositories().userRepository;
    users.findById.mockResolvedValue(fixture.user);
    fixture.clientRepository.findById.mockResolvedValue(fixture.client);

    const scopes = fixture.grant.scopes.map((name) => makeScope(name));
    assignments = scopes.map((scope) => new ClientScope(fixture.client.getId(), scope.getId(), new Date()));
    fixture.clientScopeRepository.findByClientId.mockResolvedValue(assignments);
    fixture.scopeRepository.findByIds.mockResolvedValue(scopes);
    service = await testHandler(OAuthPermissionsService, [
      { provide: USER_REPOSITORY, useValue: users },
      { provide: CLIENT_REPOSITORY, useValue: fixture.clientRepository },
      { provide: CLIENT_SCOPE_REPOSITORY, useValue: fixture.clientScopeRepository },
      { provide: SCOPE_REPOSITORY, useValue: fixture.scopeRepository },
    ]);
  });

  it("allows an active user and client with all currently assigned scopes", async () => {
    await expect(service.assertCurrentPermissions(fixture.grant)).resolves.toBeUndefined();
    expect(users.findById).toHaveBeenCalledWith(fixture.grant.userId);
    expect(fixture.clientRepository.findById).toHaveBeenCalledWith(fixture.grant.clientId);
    expect(fixture.clientScopeRepository.findByClientId).toHaveBeenCalledWith(fixture.grant.clientId);

    expect(fixture.scopeRepository.findByIds).toHaveBeenCalledWith(assignments.map((item) => item.getScopeId()));
  });

  it.each(["missing user", "blocked user", "missing client", "inactive client"])(
    "rejects %s before scope lookup",
    async (state) => {
      if (state === "missing user") users.findById.mockResolvedValue(null);

      if (state === "blocked user") fixture.user.block();

      if (state === "missing client") fixture.clientRepository.findById.mockResolvedValue(null);

      if (state === "inactive client") fixture.client.deactivate();

      await expect(service.assertCurrentPermissions(fixture.grant)).rejects.toThrow(UnauthorizedException);
      expect(fixture.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(fixture.scopeRepository.findByIds).not.toHaveBeenCalled();
    }
  );

  it.each(["one withdrawn scope", "no assigned scopes", "unrelated scope"])(
    "rejects a grant with %s",
    async (state) => {
      const names = state === "one withdrawn scope" ? ["user:read"] : state === "unrelated scope" ? ["user:write"] : [];
      fixture.scopeRepository.findByIds.mockResolvedValue(names.map((name) => makeScope(name)));

      if (state === "no assigned scopes") fixture.clientScopeRepository.findByClientId.mockResolvedValue([]);

      await expect(service.assertCurrentPermissions(fixture.grant)).rejects.toThrow(ForbiddenException);
    }
  );

  it("allows grants that request only a subset of assigned scopes", async () => {
    fixture.grant.scopes = ["user:read"];
    await expect(service.assertCurrentPermissions(fixture.grant)).resolves.toBeUndefined();
  });

  it.each(["user", "client", "assignments", "scopes"])("propagates %s repository failures", async (stage) => {
    const error = new Error("Storage unavailable");

    if (stage === "user") users.findById.mockRejectedValue(error);

    if (stage === "client") fixture.clientRepository.findById.mockRejectedValue(error);

    if (stage === "assignments") fixture.clientScopeRepository.findByClientId.mockRejectedValue(error);

    if (stage === "scopes") fixture.scopeRepository.findByIds.mockRejectedValue(error);

    await expect(service.assertCurrentPermissions(fixture.grant)).rejects.toBe(error);
  });
});
