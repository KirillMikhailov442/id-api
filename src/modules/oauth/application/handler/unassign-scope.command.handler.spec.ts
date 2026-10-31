import { testHandler } from "@shared/testing/handler-test.spec-support";

import { UnassignScopeCommand } from "@modules/oauth/application/command/unassign-scope.command";
import {
  makeClient,
  makeScope,
  oauthRepositories,
  outsider,
  requester,
} from "@modules/oauth/application/handler/oauth-test.spec-support";
import { UnassignScopeCommandHandler } from "@modules/oauth/application/handler/unassign-scope.command.handler";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ScopeNotAssignedException } from "@modules/oauth/domain/exception/scope-not-assigned.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";

describe("UnassignScopeCommandHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let client: ReturnType<typeof makeClient>;
  let scope: ReturnType<typeof makeScope>;
  let handler: UnassignScopeCommandHandler;

  beforeEach(async () => {
    repos = oauthRepositories();
    client = makeClient();
    scope = makeScope();
    repos.clientRepository.findByIdForUpdate.mockResolvedValue(client);
    repos.scopeRepository.findByName.mockResolvedValue(scope);
    repos.clientScopeRepository.exists.mockResolvedValue(true);
    handler = await testHandler(UnassignScopeCommandHandler, [
      { provide: CLIENTS_TRANSACTION, useValue: repos.transaction },
    ]);
  });

  it("revokes grants using the removed scope before deleting the assignment", async () => {
    await handler.execute(new UnassignScopeCommand(requester, client.getId().getValue(), "profile"));
    expect(repos.clientRepository.findByIdForUpdate).toHaveBeenCalledWith(client.getId());
    expect(repos.oauthGrants.revokeByClientScopes).toHaveBeenCalledWith(client.getId(), ["profile"], expect.any(Date));
    expect(repos.clientScopeRepository.delete).toHaveBeenCalledWith(client.getId(), scope.getId());
    expect(repos.oauthGrants.revokeByClientScopes.mock.invocationCallOrder[0]).toBeLessThan(
      repos.clientScopeRepository.delete.mock.invocationCallOrder[0] ?? 0
    );
  });

  it("rejects another owner before looking up scopes", async () => {
    await expect(
      handler.execute(new UnassignScopeCommand(outsider, client.getId().getValue(), "profile"))
    ).rejects.toThrow(ClientNotFoundException);
    expect(repos.scopeRepository.findByName).not.toHaveBeenCalled();
  });

  it("rejects a missing client", async () => {
    repos.clientRepository.findByIdForUpdate.mockResolvedValue(null);
    await expect(
      handler.execute(new UnassignScopeCommand(requester, client.getId().getValue(), "profile"))
    ).rejects.toThrow(ClientNotFoundException);
    expect(repos.clientScopeRepository.delete).not.toHaveBeenCalled();
  });

  it("rejects a missing scope", async () => {
    repos.scopeRepository.findByName.mockResolvedValue(null);
    await expect(
      handler.execute(new UnassignScopeCommand(requester, client.getId().getValue(), "profile"))
    ).rejects.toThrow(ScopeNotFoundException);
    expect(repos.oauthGrants.revokeByClientScopes).not.toHaveBeenCalled();
  });

  it("rejects an unassigned scope without revoking grants", async () => {
    repos.clientScopeRepository.exists.mockResolvedValue(false);
    await expect(
      handler.execute(new UnassignScopeCommand(requester, client.getId().getValue(), "profile"))
    ).rejects.toThrow(ScopeNotAssignedException);
    expect(repos.oauthGrants.revokeByClientScopes).not.toHaveBeenCalled();
    expect(repos.clientScopeRepository.delete).not.toHaveBeenCalled();
  });

  it("does not delete the assignment if grant revocation fails", async () => {
    const error = new Error("revoke failed");
    repos.oauthGrants.revokeByClientScopes.mockRejectedValue(error);
    await expect(
      handler.execute(new UnassignScopeCommand(requester, client.getId().getValue(), "profile"))
    ).rejects.toBe(error);
    expect(repos.clientScopeRepository.delete).not.toHaveBeenCalled();
  });
});
