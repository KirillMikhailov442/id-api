import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListClientScopesQueryHandler } from "@modules/oauth/application/handler/list-client-scopes.query.handler";
import {
  makeClient,
  makeScope,
  oauthRepositories,
  outsider,
  requester,
} from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ListClientScopesQuery } from "@modules/oauth/application/query/list-client-scopes.query";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

describe("ListClientScopesQueryHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let client: ReturnType<typeof makeClient>;
  let handler: ListClientScopesQueryHandler;

  beforeEach(async () => {
    repos = oauthRepositories();
    client = makeClient();
    repos.clientRepository.findById.mockResolvedValue(client);
    handler = await testHandler(ListClientScopesQueryHandler, [
      { provide: CLIENT_REPOSITORY, useValue: repos.clientRepository },
      { provide: CLIENT_SCOPE_REPOSITORY, useValue: repos.clientScopeRepository },
      { provide: SCOPE_REPOSITORY, useValue: repos.scopeRepository },
    ]);
  });

  it.each([0, 1])("resolves %s assigned scope IDs to scopes", async (size) => {
    const scope = makeScope();
    const assignments = size === 0 ? [] : [new ClientScope(client.getId(), scope.getId(), new Date())];
    const scopes = size === 0 ? [] : [scope];
    repos.clientScopeRepository.findByClientId.mockResolvedValue(assignments);
    repos.scopeRepository.findByIds.mockResolvedValue(scopes);
    await expect(handler.execute(new ListClientScopesQuery(requester, client.getId().getValue()))).resolves.toBe(
      scopes
    );
    expect(repos.clientScopeRepository.findByClientId).toHaveBeenCalledWith(client.getId());
    expect(repos.scopeRepository.findByIds).toHaveBeenCalledWith(size === 0 ? [] : [scope.getId()]);
  });

  it("does not expose assignments to another user", async () => {
    await expect(handler.execute(new ListClientScopesQuery(outsider, client.getId().getValue()))).rejects.toThrow(
      ClientNotFoundException
    );
    expect(repos.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
  });

  it("rejects a missing client before reading assignments", async () => {
    repos.clientRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new ListClientScopesQuery(requester, client.getId().getValue()))).rejects.toThrow(
      ClientNotFoundException
    );
    expect(repos.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
  });
});
