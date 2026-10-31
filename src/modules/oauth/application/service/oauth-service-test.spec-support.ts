import { mockFn } from "@shared/testing/handler-test.spec-support";

import { makeClient, oauthRepositories } from "@modules/oauth/application/handler/oauth-test.spec-support";
import type { IOAuthGrantStore, OAuthGrantContext } from "@modules/oauth/application/port/oauth-grant-store";
import type { OAuthGrant, OAuthRefreshToken } from "@modules/oauth/domain/entity/oauth-grant";
import { OAuthGrantId, OAuthRefreshTokenId } from "@modules/oauth/oauth.ids";
import { makeUser } from "@modules/user/application/handler/user-test.spec-support";

export const now = new Date("2026-01-01T00:00:00Z");
export const accessExpiresAt = new Date("2026-01-01T00:15:00Z");
export const grantExpiresAt = new Date("2026-01-02T00:00:00Z");
export function serviceFixture() {
  const repositories = oauthRepositories();
  const context = repositories.oauthGrants;
  const store = {
    ...context,
    findRefreshToken: mockFn<IOAuthGrantStore["findRefreshToken"]>(),
    listByUserId: mockFn<IOAuthGrantStore["listByUserId"]>(),
    transaction<T>(work: (context: OAuthGrantContext) => Promise<T>): Promise<T> {
      return work(context);
    },
  };
  const user = makeUser();
  const client = makeClient();
  const grant: OAuthGrant = {
    id: OAuthGrantId.create(),
    userId: user.getId(),
    clientId: client.getId(),
    scopes: ["user:read", "offline_access"],
    audience: "test-api",
    createdAt: now,
    expiresAt: grantExpiresAt,
    lastAccessExpiresAt: accessExpiresAt,
    revokedAt: null,
  };
  const refresh: OAuthRefreshToken = {
    id: OAuthRefreshTokenId.create(),
    grantId: grant.id,
    tokenHash: "refresh-hash",
    createdAt: now,
    expiresAt: grantExpiresAt,
    usedAt: null,
    revokedAt: null,
  };

  return { ...repositories, context, store, user, client, grant, refresh };
}
