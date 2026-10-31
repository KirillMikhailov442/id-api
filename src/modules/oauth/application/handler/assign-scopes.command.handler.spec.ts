import { testHandler } from "@shared/testing/handler-test.spec-support";

import { AssignScopesCommand } from "@modules/oauth/application/command/assign-scopes.command";
import { AssignScopesCommandHandler } from "@modules/oauth/application/handler/assign-scopes.command.handler";
import {
  makeClient,
  makeScope,
  oauthRepositories,
  outsider,
  requester,
} from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";

describe("AssignScopesCommandHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let client: ReturnType<typeof makeClient>;
  let handler: AssignScopesCommandHandler;

  beforeEach(async () => {
    repos = oauthRepositories();
    client = makeClient();
    repos.clientRepository.findByIdForUpdate.mockResolvedValue(client);
    repos.clientScopeRepository.findByClientId.mockResolvedValue([]);
    repos.scopeRepository.findByIds.mockResolvedValue([]);
    handler = await testHandler(AssignScopesCommandHandler, [
      { provide: CLIENTS_TRANSACTION, useValue: repos.transaction },
    ]);
  });

  it("replaces assignments, retains unchanged scopes and deduplicates names", async () => {
    const retained = makeScope("profile");
    const removed = makeScope("email");
    const added = makeScope("openid");
    const oldAssignment = new ClientScope(client.getId(), removed.getId(), new Date());
    repos.scopeRepository.findByName.mockResolvedValueOnce(retained).mockResolvedValueOnce(added);
    repos.clientScopeRepository.findByClientId.mockResolvedValue([
      new ClientScope(client.getId(), retained.getId(), new Date()),
      oldAssignment,
    ]);
    repos.scopeRepository.findByIds.mockResolvedValue([removed]);
    await expect(
      handler.execute(new AssignScopesCommand(requester, client.getId().getValue(), ["profile", "openid", "profile"]))
    ).resolves.toEqual([retained, added]);
    expect(repos.scopeRepository.findByName).toHaveBeenCalledTimes(2);
    expect(repos.scopeRepository.findByIds).toHaveBeenCalledWith([removed.getId()]);
    expect(repos.oauthGrants.revokeByClientScopes).toHaveBeenCalledWith(client.getId(), ["email"], expect.any(Date));
    expect(repos.clientScopeRepository.save).toHaveBeenCalledTimes(1);
    expect(repos.clientScopeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: client.getId(), scopeId: added.getId() })
    );
    expect(repos.clientScopeRepository.delete).toHaveBeenCalledTimes(1);
    expect(repos.clientScopeRepository.delete).toHaveBeenCalledWith(client.getId(), removed.getId());
  });

  it("removes all assignments when the target list is empty", async () => {
    const scope = makeScope();
    repos.clientScopeRepository.findByClientId.mockResolvedValue([
      new ClientScope(client.getId(), scope.getId(), new Date()),
    ]);
    repos.scopeRepository.findByIds.mockResolvedValue([scope]);
    await expect(handler.execute(new AssignScopesCommand(requester, client.getId().getValue(), []))).resolves.toEqual(
      []
    );
    expect(repos.oauthGrants.revokeByClientScopes).toHaveBeenCalledWith(client.getId(), ["profile"], expect.any(Date));
    expect(repos.clientScopeRepository.delete).toHaveBeenCalledWith(client.getId(), scope.getId());
    expect(repos.clientScopeRepository.save).not.toHaveBeenCalled();
  });

  it("does not write when all scopes are already assigned", async () => {
    const scope = makeScope();
    repos.scopeRepository.findByName.mockResolvedValue(scope);
    repos.clientScopeRepository.findByClientId.mockResolvedValue([
      new ClientScope(client.getId(), scope.getId(), new Date()),
    ]);
    await handler.execute(new AssignScopesCommand(requester, client.getId().getValue(), ["profile"]));
    expect(repos.clientScopeRepository.save).not.toHaveBeenCalled();
    expect(repos.clientScopeRepository.delete).not.toHaveBeenCalled();
    expect(repos.oauthGrants.revokeByClientScopes).toHaveBeenCalledWith(client.getId(), [], expect.any(Date));
  });

  it("rejects another owner before looking up scopes", async () => {
    await expect(
      handler.execute(new AssignScopesCommand(outsider, client.getId().getValue(), ["profile"]))
    ).rejects.toThrow(ClientNotFoundException);
    expect(repos.scopeRepository.findByName).not.toHaveBeenCalled();
  });

  it("rejects a missing client without writes", async () => {
    repos.clientRepository.findByIdForUpdate.mockResolvedValue(null);
    await expect(
      handler.execute(new AssignScopesCommand(requester, client.getId().getValue(), ["profile"]))
    ).rejects.toThrow(ClientNotFoundException);
    expect(repos.clientScopeRepository.save).not.toHaveBeenCalled();
  });

  it("rejects missing scopes before revoking or writing assignments", async () => {
    repos.scopeRepository.findByName.mockResolvedValue(null);
    await expect(
      handler.execute(new AssignScopesCommand(requester, client.getId().getValue(), ["profile"]))
    ).rejects.toThrow(ScopeNotFoundException);
    expect(repos.oauthGrants.revokeByClientScopes).not.toHaveBeenCalled();
    expect(repos.clientScopeRepository.save).not.toHaveBeenCalled();
    expect(repos.clientScopeRepository.delete).not.toHaveBeenCalled();
  });

  it("does not change assignments if revoking grants fails", async () => {
    const scope = makeScope();
    repos.scopeRepository.findByName.mockResolvedValue(scope);

    const error = new Error("revoke failed");
    repos.oauthGrants.revokeByClientScopes.mockRejectedValue(error);
    await expect(
      handler.execute(new AssignScopesCommand(requester, client.getId().getValue(), ["profile"]))
    ).rejects.toBe(error);
    expect(repos.clientScopeRepository.save).not.toHaveBeenCalled();
    expect(repos.clientScopeRepository.delete).not.toHaveBeenCalled();
  });
});
