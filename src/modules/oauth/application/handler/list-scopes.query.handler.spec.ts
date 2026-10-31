import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListScopesQueryHandler } from "@modules/oauth/application/handler/list-scopes.query.handler";
import { makeScope, oauthRepositories } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ListScopesQuery } from "@modules/oauth/application/query/list-scopes.query";
import { SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

describe("ListScopesQueryHandler", () => {
  it.each([0, 1])("returns %s scopes with pagination and total", async (size) => {
    const { scopeRepository } = oauthRepositories();
    const items = size === 0 ? [] : [makeScope()];
    scopeRepository.findAll.mockResolvedValue(items);
    scopeRepository.count.mockResolvedValue(15);

    const handler = await testHandler(ListScopesQueryHandler, [
      { provide: SCOPE_REPOSITORY, useValue: scopeRepository },
    ]);
    await expect(handler.execute(new ListScopesQuery(5, 10))).resolves.toEqual({ items, total: 15 });
    expect(scopeRepository.findAll).toHaveBeenCalledWith({ limit: 5, offset: 10 });
    expect(scopeRepository.count).toHaveBeenCalledTimes(1);
  });

  it("propagates repository errors", async () => {
    const { scopeRepository } = oauthRepositories();
    const error = new Error("lookup failed");
    scopeRepository.findAll.mockRejectedValue(error);
    scopeRepository.count.mockResolvedValue(0);

    const handler = await testHandler(ListScopesQueryHandler, [
      { provide: SCOPE_REPOSITORY, useValue: scopeRepository },
    ]);
    await expect(handler.execute(new ListScopesQuery(5, 0))).rejects.toBe(error);
  });
});
