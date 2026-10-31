import { testHandler } from "@shared/testing/handler-test.spec-support";

import { ListClientsQueryHandler } from "@modules/oauth/application/handler/list-clients.query.handler";
import { makeClient, oauthRepositories, requester } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ListClientsQuery } from "@modules/oauth/application/query/list-clients.query";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";
import { UserId } from "@modules/user/user.ids";

describe("ListClientsQueryHandler", () => {
  it.each([0, 1])("returns %s clients scoped to the requester", async (size) => {
    const { clientRepository } = oauthRepositories();
    const items = size === 0 ? [] : [makeClient()];
    clientRepository.findByUserId.mockResolvedValue(items);
    clientRepository.countByUserId.mockResolvedValue(12);

    const handler = await testHandler(ListClientsQueryHandler, [
      { provide: CLIENT_REPOSITORY, useValue: clientRepository },
    ]);
    await expect(handler.execute(new ListClientsQuery(requester, 5, 10))).resolves.toEqual({ items, total: 12 });
    expect(clientRepository.findByUserId).toHaveBeenCalledWith(UserId.from(requester.userId), { limit: 5, offset: 10 });
    expect(clientRepository.countByUserId).toHaveBeenCalledWith(UserId.from(requester.userId));
    expect(clientRepository.findAll).not.toHaveBeenCalled();
  });

  it("propagates repository errors", async () => {
    const { clientRepository } = oauthRepositories();
    const error = new Error("lookup failed");
    clientRepository.findByUserId.mockRejectedValue(error);

    const handler = await testHandler(ListClientsQueryHandler, [
      { provide: CLIENT_REPOSITORY, useValue: clientRepository },
    ]);
    await expect(handler.execute(new ListClientsQuery(requester, 5, 0))).rejects.toBe(error);
  });
});
