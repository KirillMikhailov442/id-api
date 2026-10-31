import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { CreateScopeCommand } from "@modules/oauth/application/command/create-scope.command";
import { CreateScopeCommandHandler } from "@modules/oauth/application/handler/create-scope.command.handler";
import { makeScope, oauthRepositories } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { ScopeAlreadyExistsException } from "@modules/oauth/domain/exception/scope-already-exists.exception";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

describe("CreateScopeCommandHandler", () => {
  let repos: ReturnType<typeof oauthRepositories>;
  let handler: CreateScopeCommandHandler;

  beforeEach(async () => {
    repos = oauthRepositories();
    repos.scopeRepository.findByName.mockResolvedValue(null);
    handler = await testHandler(CreateScopeCommandHandler, [
      { provide: SCOPE_REPOSITORY, useValue: repos.scopeRepository },
    ]);
  });

  it("saves a new scope", async () => {
    const scope = await handler.execute(new CreateScopeCommand("profile"));
    expect(scope.getName().getValue()).toBe("profile");
    expect(repos.scopeRepository.findByName).toHaveBeenCalledWith(new ScopeName("profile"));
    expect(repos.scopeRepository.save).toHaveBeenCalledWith(scope);
  });

  it("rejects a duplicate without saving", async () => {
    repos.scopeRepository.findByName.mockResolvedValue(makeScope());
    await expect(handler.execute(new CreateScopeCommand("profile"))).rejects.toThrow(ScopeAlreadyExistsException);
    expect(repos.scopeRepository.save).not.toHaveBeenCalled();
  });

  it("rejects invalid names before lookup", async () => {
    await expect(handler.execute(new CreateScopeCommand(""))).rejects.toThrow(InvalidValueObjectException);
    expect(repos.scopeRepository.findByName).not.toHaveBeenCalled();
  });
});
