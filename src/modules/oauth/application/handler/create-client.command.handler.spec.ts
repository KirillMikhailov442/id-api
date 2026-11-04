import { EventBus } from "@nestjs/cqrs";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { CreateClientCommand } from "@modules/oauth/application/command/create-client.command";
import { CreateClientCommandHandler } from "@modules/oauth/application/handler/create-client.command.handler";
import { makeScope, oauthRepositories, requester } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ClientCreatedEvent } from "@modules/oauth/domain/event/client-created.event";
import { ScopeNotFoundException } from "@modules/oauth/domain/exception/scope-not-found.exception";
import { CLIENTS_TRANSACTION } from "@modules/oauth/oauth.tokens";
import { PASSWORD_HASHER } from "@modules/user/user.module";

describe("CreateClientCommandHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let handler: CreateClientCommandHandler;
  const hash = jest.fn<Promise<string>, [string]>();
  const publish = jest.fn();

  beforeEach(async () => {
    repos = oauthRepositories();
    hash.mockReset();
    publish.mockReset();
    hash.mockResolvedValue("secret-hash");
    repos.scopeRepository.findByName.mockResolvedValue(makeScope());
    handler = await testHandler(CreateClientCommandHandler, [
      { provide: CLIENTS_TRANSACTION, useValue: repos.transaction },
      { provide: PASSWORD_HASHER, useValue: { hash } },
      { provide: EventBus, useValue: { publish } },
    ]);
  });

  it("hashes the secret, deduplicates scopes and persists assignments before publishing", async () => {
    const client = await handler.execute(
      new CreateClientCommand(requester, "Client", "test-client-secret", "https://app.example.com/callback", [
        "profile",
        "profile",
      ])
    );
    expect(hash).toHaveBeenCalledWith("test-client-secret");
    expect(client.getUserId().getValue()).toBe(requester.userId);
    expect(client.getSecretHash()).toBe("secret-hash");
    expect(client.getLocation()?.getValue()).toBe("https://app.example.com/callback");
    expect(client.getScopes().map((scope) => scope.getName().getValue())).toEqual(["profile"]);
    expect(repos.scopeRepository.findByName).toHaveBeenCalledTimes(1);
    expect(repos.clientRepository.save).toHaveBeenCalledWith(client);
    expect(repos.clientScopeRepository.save).toHaveBeenCalledTimes(1);
    expect(repos.clientScopeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: client.getId() })
    );
    expect(publish).toHaveBeenCalledWith(new ClientCreatedEvent(client.getId(), client.getUserId(), client.getName()));
  });

  it("supports clients without a location or scopes", async () => {
    const client = await handler.execute(new CreateClientCommand(requester, "Client", "test-client-secret"));
    expect(client.getLocation()).toBeNull();
    expect(client.getScopes()).toEqual([]);
    expect(repos.scopeRepository.findByName).not.toHaveBeenCalled();
    expect(repos.clientScopeRepository.save).not.toHaveBeenCalled();
    expect(repos.clientRepository.save).toHaveBeenCalledWith(client);
  });

  it("does not persist the client when a requested scope is missing", async () => {
    repos.scopeRepository.findByName.mockResolvedValue(null);
    await expect(
      handler.execute(new CreateClientCommand(requester, "Client", "test-client-secret", undefined, ["profile"]))
    ).rejects.toThrow(ScopeNotFoundException);
    expect(repos.clientRepository.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("does not publish when assignment persistence fails", async () => {
    const error = new Error("assignment failed");
    repos.clientScopeRepository.save.mockRejectedValue(error);
    await expect(
      handler.execute(new CreateClientCommand(requester, "Client", "test-client-secret", undefined, ["profile"]))
    ).rejects.toBe(error);
    expect(publish).not.toHaveBeenCalled();
  });
});
