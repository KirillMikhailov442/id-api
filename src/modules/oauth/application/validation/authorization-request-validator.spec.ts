import { InvalidValueObjectException } from "@shared/exception/base/invalid-value-object.exception";
import { testHandler } from "@shared/testing/handler-test.spec-support";

import { makeClient, makeScope, oauthRepositories } from "@modules/oauth/application/handler/oauth-test.spec-support";
import { AuthorizationRequestValidator } from "@modules/oauth/application/validation/authorization-request-validator";
import { ClientScope } from "@modules/oauth/domain/entity/client-scope";
import { AuthorizationScopesNotAllowedException } from "@modules/oauth/domain/exception/authorization-scopes-not-allowed.exception";
import { ClientInactiveException } from "@modules/oauth/domain/exception/client-inactive.exception";
import { ClientNotFoundException } from "@modules/oauth/domain/exception/client-not-found.exception";
import { RedirectUriNotAllowedException } from "@modules/oauth/domain/exception/redirect-uri-not-allowed.exception";
import { LocationHref } from "@modules/oauth/domain/value-object/location-href.value-object";
import { CLIENT_REPOSITORY, CLIENT_SCOPE_REPOSITORY, SCOPE_REPOSITORY } from "@modules/oauth/oauth.tokens";

describe("AuthorizationRequestValidator", () => {
  let repositories: ReturnType<typeof oauthRepositories>;
  let client: ReturnType<typeof makeClient>;
  let validator: AuthorizationRequestValidator;
  const redirectUri = "https://app.example.com/callback";

  beforeEach(async () => {
    repositories = oauthRepositories();
    client = makeClient();
    client.updateLocation(new LocationHref(redirectUri));
    repositories.clientRepository.findById.mockResolvedValue(client);

    const scopes = [makeScope("openid"), makeScope("user:read"), makeScope("offline_access")];
    repositories.clientScopeRepository.findByClientId.mockResolvedValue(
      scopes.map((scope) => new ClientScope(client.getId(), scope.getId(), new Date()))
    );
    repositories.scopeRepository.findByIds.mockResolvedValue(scopes);
    validator = await testHandler(AuthorizationRequestValidator, [
      { provide: CLIENT_REPOSITORY, useValue: repositories.clientRepository },
      { provide: CLIENT_SCOPE_REPOSITORY, useValue: repositories.clientScopeRepository },
      { provide: SCOPE_REPOSITORY, useValue: repositories.scopeRepository },
    ]);
  });

  describe.each(["validateRedirect", "validate"] as const)("%s redirect checks", (method) => {
    const invoke = (uri = redirectUri) => validator[method](client.getId(), uri, ["openid"]);

    it("returns the registered client for an allowed redirect", async () => {
      await expect(invoke()).resolves.toBe(client);
      expect(repositories.clientRepository.findById).toHaveBeenCalledTimes(1);
      expect(repositories.clientRepository.findById).toHaveBeenCalledWith(client.getId());
    });

    it("compares normalized absolute URIs", async () => {
      await expect(invoke("  HTTPS://APP.EXAMPLE.COM:443/other/../callback  ")).resolves.toBe(client);
    });

    it("rejects a missing client before URI validation or scope lookup", async () => {
      repositories.clientRepository.findById.mockResolvedValue(null);
      await expect(invoke("invalid-uri")).rejects.toThrow(ClientNotFoundException);
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });

    it("rejects clients without a registered redirect URI", async () => {
      client = makeClient();
      repositories.clientRepository.findById.mockResolvedValue(client);
      await expect(invoke()).rejects.toThrow(RedirectUriNotAllowedException);
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
    });

    it.each([
      "https://attacker.example.com/callback",
      "https://app.example.com.attacker.example/callback",
      "https://app.example.com@attacker.example/callback",
      "http://app.example.com/callback",
      "https://app.example.com:8443/callback",
      "https://app.example.com/Callback",
      "https://app.example.com/callback/extra",
      "https://app.example.com/callback?next=attacker",
      "https://app.example.com/callback#fragment",
    ])("rejects a non-matching redirect %s before scope lookup", async (uri) => {
      await expect(invoke(uri)).rejects.toThrow(RedirectUriNotAllowedException);
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });

    it.each(["", "/callback", "https://[invalid]"])("rejects invalid absolute URI %p", async (uri) => {
      await expect(invoke(uri)).rejects.toThrow(InvalidValueObjectException);
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });

    it("requires registered query parameters to match", async () => {
      client.updateLocation(new LocationHref(`${redirectUri}?tenant=one`));
      await expect(invoke(`${redirectUri}?tenant=one`)).resolves.toBe(client);
      await expect(invoke(`${redirectUri}?tenant=two`)).rejects.toThrow(RedirectUriNotAllowedException);
      await expect(invoke()).rejects.toThrow(RedirectUriNotAllowedException);
    });

    it("propagates client repository failures without continuing validation", async () => {
      const error = new Error("Client storage unavailable");
      repositories.clientRepository.findById.mockRejectedValue(error);
      await expect(invoke()).rejects.toBe(error);
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });
  });

  describe("validateRedirect", () => {
    it("allows a registered redirect for an inactive client without querying scopes", async () => {
      client.deactivate();
      await expect(validator.validateRedirect(client.getId(), redirectUri)).resolves.toBe(client);
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });
  });

  describe("validate", () => {
    it.each([
      { scopes: ["openid"] },
      { scopes: ["user:read", "openid"] },
      { scopes: ["offline_access", "openid", "user:read"] },
    ])("allows requested scopes $scopes when all are assigned", async ({ scopes }) => {
      await expect(validator.validate(client.getId(), redirectUri, scopes)).resolves.toBe(client);
      expect(repositories.clientScopeRepository.findByClientId).toHaveBeenCalledWith(client.getId());
    });

    it("loads scope names by the IDs actually assigned to the client", async () => {
      const scope = makeScope("user:read");
      const assignment = new ClientScope(client.getId(), scope.getId(), new Date());
      repositories.clientScopeRepository.findByClientId.mockResolvedValue([assignment]);
      repositories.scopeRepository.findByIds.mockResolvedValue([scope]);
      await expect(validator.validate(client.getId(), redirectUri, ["user:read"])).resolves.toBe(client);
      expect(repositories.scopeRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(repositories.scopeRepository.findByIds).toHaveBeenCalledWith([scope.getId()]);
    });

    it("rejects an inactive client before parsing scopes or querying assignments", async () => {
      client.deactivate();
      await expect(validator.validate(client.getId(), redirectUri, [])).rejects.toThrow(ClientInactiveException);
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });

    it("rejects an invalid redirect before reporting client inactivity", async () => {
      client.deactivate();
      await expect(validator.validate(client.getId(), "https://attacker.example.com", ["openid"])).rejects.toThrow(
        RedirectUriNotAllowedException
      );
    });

    it.each([{ scopes: ["user:write"] }, { scopes: ["openid", "user:write"] }, { scopes: ["OpenId"] }])(
      "requires every scope to be assigned with matching case: $scopes",
      async ({ scopes }) => {
        await expect(validator.validate(client.getId(), redirectUri, scopes)).rejects.toThrow(
          AuthorizationScopesNotAllowedException
        );
      }
    );

    it("rejects a request when the client has no scope assignments", async () => {
      repositories.clientScopeRepository.findByClientId.mockResolvedValue([]);
      repositories.scopeRepository.findByIds.mockResolvedValue([]);
      await expect(validator.validate(client.getId(), redirectUri, ["openid"])).rejects.toThrow(
        AuthorizationScopesNotAllowedException
      );
      expect(repositories.scopeRepository.findByIds).toHaveBeenCalledWith([]);
    });

    it("rejects assigned scope IDs whose scope records have been deleted", async () => {
      repositories.scopeRepository.findByIds.mockResolvedValue([makeScope("openid")]);
      await expect(validator.validate(client.getId(), redirectUri, ["openid", "user:read"])).rejects.toThrow(
        AuthorizationScopesNotAllowedException
      );
    });

    it.each([
      { scopes: [] },
      { scopes: [""] },
      { scopes: ["openid user:read"] },
      { scopes: [" openid"] },
      { scopes: ["a".repeat(33)] },
      { scopes: Array<string>(8).fill("a".repeat(32)) },
    ])("rejects malformed scopes before querying assignments: $scopes", async ({ scopes }) => {
      await expect(validator.validate(client.getId(), redirectUri, scopes)).rejects.toThrow(
        InvalidValueObjectException
      );
      expect(repositories.clientScopeRepository.findByClientId).not.toHaveBeenCalled();
      expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });

    it.each(["assignments", "scopes"])("propagates %s repository failures", async (stage) => {
      const error = new Error("Scope storage unavailable");

      if (stage === "assignments") repositories.clientScopeRepository.findByClientId.mockRejectedValue(error);
      else repositories.scopeRepository.findByIds.mockRejectedValue(error);

      await expect(validator.validate(client.getId(), redirectUri, ["openid"])).rejects.toBe(error);

      if (stage === "assignments") expect(repositories.scopeRepository.findByIds).not.toHaveBeenCalled();
    });
  });
});
