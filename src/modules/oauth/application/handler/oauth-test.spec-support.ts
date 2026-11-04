import { mockFn } from "@shared/testing/handler-test.spec-support";

import type { IClientRepository } from "@modules/oauth/application/port/client-repository.type";
import type { IClientScopeRepository } from "@modules/oauth/application/port/client-scope-repository.type";
import type { OAuthGrantContext } from "@modules/oauth/application/port/oauth-grant-store";
import type { IScopeRepository } from "@modules/oauth/application/port/scope-repository.type";
import type { IClientsTransactionContext } from "@modules/oauth/application/port/transaction.port";
import { AuthorizationCode } from "@modules/oauth/domain/entity/authorization-code";
import { Client } from "@modules/oauth/domain/entity/client";
import { Scope } from "@modules/oauth/domain/entity/scope";
import { ClientName } from "@modules/oauth/domain/value-object/client-name.value-object";
import { CodeHash } from "@modules/oauth/domain/value-object/code-hash.value-object";
import { CodeScopes } from "@modules/oauth/domain/value-object/code-scopes.value-object";
import { RedirectUri } from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { ScopeName } from "@modules/oauth/domain/value-object/scope-name.value-object";
import { UserId } from "@modules/user/user.ids";

export const ownerId = "00000000-0000-4000-8000-000000000001";
export const requester = { userId: ownerId, roles: [] as string[] };
export const outsider = { userId: "00000000-0000-4000-8000-000000000002", roles: [] as string[] };

export function makeClient(scopes: readonly Scope[] = []) {
  return Client.create({
    userId: UserId.from(ownerId),
    name: new ClientName("Test client"),
    secretHash: "secret-hash",
    scopes,
  });
}

export function makeScope(name = "profile") {
  return Scope.create({ name: new ScopeName(name) });
}

export function makeCode(client: Client) {
  return AuthorizationCode.create({
    clientId: client.getId(),
    userId: client.getUserId(),
    codeHash: new CodeHash("a".repeat(64)),
    scopes: new CodeScopes(["profile"]),
    redirectUri: new RedirectUri("https://app.example.com/callback"),
    expiresAt: new Date("2100-01-01"),
  });
}

export function oauthRepositories() {
  const clientRepository = {
    findById: mockFn<IClientRepository["findById"]>(),
    findByIdForUpdate: mockFn<IClientRepository["findByIdForUpdate"]>(),
    save: mockFn<IClientRepository["save"]>(),
    delete: mockFn<IClientRepository["delete"]>(),
    findByUserId: mockFn<IClientRepository["findByUserId"]>(),
    findAll: mockFn<IClientRepository["findAll"]>(),
    count: mockFn<IClientRepository["count"]>(),
    countByUserId: mockFn<IClientRepository["countByUserId"]>(),
  };
  const scopeRepository = {
    findById: mockFn<IScopeRepository["findById"]>(),
    save: mockFn<IScopeRepository["save"]>(),
    delete: mockFn<IScopeRepository["delete"]>(),
    findByName: mockFn<IScopeRepository["findByName"]>(),
    findByIds: mockFn<IScopeRepository["findByIds"]>(),
    findAll: mockFn<IScopeRepository["findAll"]>(),
    count: mockFn<IScopeRepository["count"]>(),
  };
  const clientScopeRepository = {
    findByClientId: mockFn<IClientScopeRepository["findByClientId"]>(),
    exists: mockFn<IClientScopeRepository["exists"]>(),
    save: mockFn<IClientScopeRepository["save"]>(),
    delete: mockFn<IClientScopeRepository["delete"]>(),
    deleteByClientId: mockFn<IClientScopeRepository["deleteByClientId"]>(),
  };
  const oauthGrants = {
    lockClient: mockFn<OAuthGrantContext["lockClient"]>(),
    revokeByClientScopes: mockFn<OAuthGrantContext["revokeByClientScopes"]>(),
    lockAuthorizationCode: mockFn<OAuthGrantContext["lockAuthorizationCode"]>(),
    consumeAuthorizationCode: mockFn<OAuthGrantContext["consumeAuthorizationCode"]>(),
    findGrant: mockFn<OAuthGrantContext["findGrant"]>(),
    saveGrant: mockFn<OAuthGrantContext["saveGrant"]>(),
    findRefreshToken: mockFn<OAuthGrantContext["findRefreshToken"]>(),
    saveRefreshToken: mockFn<OAuthGrantContext["saveRefreshToken"]>(),
    revokeGrant: mockFn<OAuthGrantContext["revokeGrant"]>(),
  };
  const context = { clientRepository, scopeRepository, clientScopeRepository, oauthGrants };
  const transaction = {
    run: <T>(work: (context: IClientsTransactionContext) => Promise<T>): Promise<T> => work(context),
  };

  return { ...context, transaction };
}
