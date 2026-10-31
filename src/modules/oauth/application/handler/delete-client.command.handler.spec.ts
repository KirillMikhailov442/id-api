import { EventBus } from "@nestjs/cqrs";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { DeleteClientCommand } from "@modules/oauth/application/command/delete-client.command";
import { DeleteClientCommandHandler } from "@modules/oauth/application/handler/delete-client.command.handler";
import {
  makeClient,
  oauthRepositories,
  outsider,
  requester,
} from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ClientDeletedEvent } from "@modules/oauth/domain/event/client-deleted.event";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { CLIENT_REPOSITORY, CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";

describe("DeleteClientCommandHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let client: ReturnType<typeof makeClient>;
  let handler: DeleteClientCommandHandler;
  const publish = jest.fn();

  beforeEach(async () => {
    repos = oauthRepositories();
    client = makeClient();
    publish.mockReset();
    repos.clientRepository.findById.mockResolvedValue(client);
    handler = await testHandler(DeleteClientCommandHandler, [
      { provide: CLIENT_REPOSITORY, useValue: repos.clientRepository },
      { provide: CLIENTS_TRANSACTION, useValue: repos.transaction },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  it("deletes assignments and the client before publishing", async () => {
    await expect(handler.execute(new DeleteClientCommand(requester, client.getId().getValue()))).resolves.toBe(client);
    expect(repos.clientScopeRepository.deleteByClientId).toHaveBeenCalledWith(client.getId());
    expect(repos.clientRepository.delete).toHaveBeenCalledWith(client.getId());
    expect(publish).toHaveBeenCalledWith(new ClientDeletedEvent(client.getId(), client.getUserId()));
    expect(repos.clientScopeRepository.deleteByClientId.mock.invocationCallOrder[0]).toBeLessThan(
      repos.clientRepository.delete.mock.invocationCallOrder[0] ?? 0
    );
    expect(repos.clientRepository.delete.mock.invocationCallOrder[0]).toBeLessThan(
      publish.mock.invocationCallOrder[0] ?? 0
    );
  });

  it("does not delete another owner's client", async () => {
    await expect(handler.execute(new DeleteClientCommand(outsider, client.getId().getValue()))).rejects.toThrow(
      ClientNotFoundException
    );
    expect(repos.clientRepository.delete).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("rejects a missing client", async () => {
    repos.clientRepository.findById.mockResolvedValue(null);
    await expect(handler.execute(new DeleteClientCommand(requester, client.getId().getValue()))).rejects.toThrow(
      ClientNotFoundException
    );
    expect(repos.clientScopeRepository.deleteByClientId).not.toHaveBeenCalled();
  });

  it("does not publish if deleting fails", async () => {
    const error = new Error("delete failed");
    repos.clientRepository.delete.mockRejectedValue(error);
    await expect(handler.execute(new DeleteClientCommand(requester, client.getId().getValue()))).rejects.toBe(error);
    expect(publish).not.toHaveBeenCalled();
  });
});
