import { testHandler } from "@shared/testing/handler-test.spec-support";

import { UpdateClientCommand } from "@modules/oauth/application/command/update-client.command";
import {
  makeClient,
  oauthRepositories,
  outsider,
  requester,
} from "@modules/oauth/application/handler/oauth-test.spec-support";
import { UpdateClientCommandHandler } from "@modules/oauth/application/handler/update-client.command.handler";
import { ClientAlreadyActiveException } from "@modules/oauth/domain/exception/client-already-active.exception";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { CLIENT_REPOSITORY } from "@modules/oauth/oauth.tokens";

describe("UpdateClientCommandHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let client: ReturnType<typeof makeClient>;
  let handler: UpdateClientCommandHandler;

  beforeEach(async () => {
    repos = oauthRepositories();
    client = makeClient();
    repos.clientRepository.findById.mockResolvedValue(client);
    handler = await testHandler(UpdateClientCommandHandler, [
      { provide: CLIENT_REPOSITORY, useValue: repos.clientRepository },
    ]);
  });

  it("updates supplied fields and deactivates the client", async () => {
    await expect(
      handler.execute(
        new UpdateClientCommand(
          requester,
          client.getId().getValue(),
          "Updated",
          false,
          "https://app.example.com/callback"
        )
      )
    ).resolves.toBe(client);
    expect(client.getName().getValue()).toBe("Updated");
    expect(client.getLocation()?.getValue()).toBe("https://app.example.com/callback");
    expect(client.getIsActive()).toBe(false);
    expect(repos.clientRepository.save).toHaveBeenCalledWith(client);
  });

  it("activates an inactive client", async () => {
    client.deactivate();
    await handler.execute(new UpdateClientCommand(requester, client.getId().getValue(), undefined, true));
    expect(client.getIsActive()).toBe(true);
  });

  it("preserves omitted fields", async () => {
    await handler.execute(new UpdateClientCommand(requester, client.getId().getValue()));
    expect(client.getName().getValue()).toBe("Test client");
    expect(client.getIsActive()).toBe(true);
    expect(client.getLocation()).toBeNull();
  });

  it("rejects access by another owner before saving", async () => {
    await expect(
      handler.execute(new UpdateClientCommand(outsider, client.getId().getValue(), "Updated"))
    ).rejects.toThrow(ClientNotFoundException);
    expect(client.getName().getValue()).toBe("Test client");
    expect(repos.clientRepository.save).not.toHaveBeenCalled();
  });

  it("rejects missing clients", async () => {
    repos.clientRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new UpdateClientCommand(requester, client.getId().getValue()))).rejects.toThrow(
      ClientNotFoundException
    );
    expect(repos.clientRepository.save).not.toHaveBeenCalled();
  });

  it("does not save an already active client when activation is requested", async () => {
    await expect(
      handler.execute(new UpdateClientCommand(requester, client.getId().getValue(), undefined, true))
    ).rejects.toThrow(ClientAlreadyActiveException);
    expect(repos.clientRepository.save).not.toHaveBeenCalled();
  });
});
