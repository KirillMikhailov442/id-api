import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import {
  OAUTH_ACCESS_TOKEN_SERVICE,
  type IOAuthAccessTokenService,
  type OAuthAccessClaims,
} from "@modules/oauth/application/port/oauth-access-token-service";
import { OAUTH_GRANT_STORE } from "@modules/oauth/application/port/oauth-grant-store";
import {
  OAUTH_REVOCATION_STORE,
  type IOAuthRevocationStore,
} from "@modules/oauth/application/port/oauth-revocation-store";
import { OAuthAuthorizationService } from "@modules/oauth/application/service/oauth-authorization.service";
import { OAuthPermissionsService } from "@modules/oauth/application/service/oauth-permissions.service";
import { now, serviceFixture } from "@modules/oauth/application/service/oauth-service-test.spec-support";
import { ClientId } from "@modules/oauth/oauth.ids";
import { UserId } from "@modules/user/user.ids";

describe("OAuthAuthorizationService", () => {
  let fixture: ReturnType<typeof serviceFixture>;
  let service: OAuthAuthorizationService;
  let claims: OAuthAccessClaims;
  const verify = mockFn<IOAuthAccessTokenService["verify"]>();
  const isRevoked = mockFn<IOAuthRevocationStore["isRevoked"]>();
  const permissions = mockFn<OAuthPermissionsService["assertCurrentPermissions"]>();

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    verify.mockReset();
    isRevoked.mockReset();
    permissions.mockReset();
    fixture = serviceFixture();
    claims = {
      userId: fixture.grant.userId.getValue(),
      clientId: fixture.grant.clientId.getValue(),
      grantId: fixture.grant.id.getValue(),
      scopes: [...fixture.grant.scopes],
    };
    verify.mockResolvedValue(claims);
    isRevoked.mockResolvedValue(false);
    fixture.store.findGrant.mockResolvedValue(fixture.grant);
    service = await testHandler(OAuthAuthorizationService, [
      { provide: ConfigService, useValue: new ConfigService({ OAUTH_AUDIENCE: "test-api" }) },
      { provide: OAUTH_ACCESS_TOKEN_SERVICE, useValue: { verify } },
      { provide: OAUTH_GRANT_STORE, useValue: fixture.store },
      { provide: OAUTH_REVOCATION_STORE, useValue: { isRevoked } },
      { provide: OAuthPermissionsService, useValue: { assertCurrentPermissions: permissions } },
    ]);
  });

  afterEach(() => jest.useRealTimers());

  it("returns verified OAuth identity after checking revocation, the grant and current permissions", async () => {
    await expect(service.authorize("access-token", ["user:read"])).resolves.toEqual({
      ...claims,
      type: AccessTokenType.OAuth,
    });
    expect(verify).toHaveBeenCalledWith("access-token");
    expect(isRevoked).toHaveBeenCalledWith(fixture.grant.id);
    expect(fixture.store.findGrant).toHaveBeenCalledWith(fixture.grant.id);
    expect(permissions).toHaveBeenCalledWith(fixture.grant);
  });

  it("rejects revoked tokens before accessing the grant", async () => {
    isRevoked.mockResolvedValue(true);
    await expect(service.authorize("access-token", [])).rejects.toThrow(UnauthorizedException);
    expect(fixture.store.findGrant).not.toHaveBeenCalled();
    expect(permissions).not.toHaveBeenCalled();
  });

  it.each(["missing", "revoked", "expired", "expiry boundary", "wrong user", "wrong client", "wrong audience"])(
    "rejects a grant that is %s before checking current permissions",
    async (state) => {
      if (state === "missing") fixture.store.findGrant.mockResolvedValue(null);

      if (state === "revoked") fixture.grant.revokedAt = now;

      if (state === "expired") fixture.grant.expiresAt = new Date(now.getTime() - 1);

      if (state === "expiry boundary") fixture.grant.expiresAt = now;

      if (state === "wrong user") fixture.grant.userId = UserId.create();

      if (state === "wrong client") fixture.grant.clientId = ClientId.create();

      if (state === "wrong audience") fixture.grant.audience = "another-api";

      await expect(service.authorize("access-token", [])).rejects.toThrow(UnauthorizedException);
      expect(permissions).not.toHaveBeenCalled();
    }
  );

  it("accepts a grant one millisecond before expiry", async () => {
    fixture.grant.expiresAt = new Date(now.getTime() + 1);
    await expect(service.authorize("access-token", ["user:read"])).resolves.toMatchObject({
      type: AccessTokenType.OAuth,
    });
  });

  it.each([
    "scope outside grant",
    "required scope missing in token",
    "required scope missing in grant",
    "only one required scope present",
  ])("rejects %s", async (state) => {
    let required = ["user:read"];

    if (state === "scope outside grant") claims.scopes.push("user:write");

    if (state === "required scope missing in token") claims.scopes = ["offline_access"];

    if (state === "required scope missing in grant") fixture.grant.scopes = ["offline_access"];

    if (state === "only one required scope present") required = ["user:read", "user:write"];

    await expect(service.authorize("access-token", required)).rejects.toThrow(ForbiddenException);
  });

  it("accepts narrower token scopes and returns only the token's permissions", async () => {
    claims.scopes = ["user:read"];
    await expect(service.authorize("access-token", ["user:read"])).resolves.toEqual({
      ...claims,
      type: AccessTokenType.OAuth,
    });
  });

  it.each(["verification", "revocation store", "grant store", "permissions"])(
    "propagates %s failures",
    async (stage) => {
      const error = new Error("Dependency failed");

      if (stage === "verification") verify.mockRejectedValue(error);

      if (stage === "revocation store") isRevoked.mockRejectedValue(error);

      if (stage === "grant store") fixture.store.findGrant.mockRejectedValue(error);

      if (stage === "permissions") permissions.mockRejectedValue(error);

      await expect(service.authorize("access-token", [])).rejects.toBe(error);

      if (stage === "verification") expect(isRevoked).not.toHaveBeenCalled();

      if (stage !== "permissions") expect(permissions).not.toHaveBeenCalled();
    }
  );
});
