import { testHandler } from "@shared/testing/handler-test.spec-support";

import { GetClientQueryHandler } from "@modules/oauth/application/handler/get-client.query.handler";
import {
  makeClient,
  oauthRepositories,
  outsider,
  requester,
} from "@modules/oauth/application/handler/oauth-test.spec-support";
import { GetClientQuery } from "@modules/oauth/application/query/get-client.query";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";
import { RoleType } from "@modules/user/user.module";

describe("GetClientQueryHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let client: ReturnType<typeof makeClient>;
  let handler: GetClientQueryHandler;

  beforeEach(async () => {
    repos = oauthRepositories();
    client = makeClient();
    repos.clientRepository.findById.mockResolvedValue(client);
    handler = await testHandler(GetClientQueryHandler, [
      { provide: CLIENT_REPOSITORY, useValue: repos.clientRepository },
    ]);
  });

  it.each([requester, { ...outsider, roles: [RoleType.Admin] }])(
    "returns the client to its owner or an admin",
    async (actor) => {
      await expect(handler.execute(new GetClientQuery(actor, client.getId().getValue()))).resolves.toBe(client);
      expect(repos.clientRepository.findById).toHaveBeenCalledWith(client.getId());
    }
  );

  it("hides another user's client", async () => {
    await expect(handler.execute(new GetClientQuery(outsider, client.getId().getValue()))).rejects.toThrow(
      ClientNotFoundException
    );
  });

  it("rejects a missing client", async () => {
    repos.clientRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new GetClientQuery(requester, client.getId().getValue()))).rejects.toThrow(
      ClientNotFoundException
    );
  });
});
