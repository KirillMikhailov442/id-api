import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListAllClientsQueryHandler } from "@modules/oauth/application/handler/list-all-clients.query.handler";
import { makeClient, oauthRepositories } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ListAllClientsQuery } from "@modules/oauth/application/query/list-all-clients.query";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";

describe("ListAllClientsQueryHandler", () => {
  it.each([0, 1])("returns %s clients with pagination and total", async (size) => {
    const { clientRepository } = oauthRepositories();
    const items = size === 0 ? [] : [makeClient()];
    clientRepository.findAll.mockResolvedValue(items);
    clientRepository.count.mockResolvedValue(15);

    const handler = await testHandler(ListAllClientsQueryHandler, [
      { provide: CLIENT_REPOSITORY, useValue: clientRepository },
    ]);
    await expect(handler.execute(new ListAllClientsQuery(5, 10))).resolves.toEqual({ items, total: 15 });
    expect(clientRepository.findAll).toHaveBeenCalledWith({ limit: 5, offset: 10 });
    expect(clientRepository.count).toHaveBeenCalledTimes(1);
  });

  it("propagates repository errors", async () => {
    const { clientRepository } = oauthRepositories();
    const error = new Error("lookup failed");
    clientRepository.findAll.mockRejectedValue(error);
    clientRepository.count.mockResolvedValue(0);

    const handler = await testHandler(ListAllClientsQueryHandler, [
      { provide: CLIENT_REPOSITORY, useValue: clientRepository },
    ]);
    await expect(handler.execute(new ListAllClientsQuery(5, 0))).rejects.toBe(error);
  });
});
