import { NotFoundException } from "@nestjs/common";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { OAUTH_GRANT_STORE } from "@modules/oauth/application/port/oauth-grant-store";
import {
  OAUTH_REVOCATION_STORE,
  type IOAuthRevocationStore,
} from "@modules/oauth/application/port/oauth-revocation-store";
import { OAuthGrantRevocationService } from "@modules/oauth/application/service/oauth-grant-revocation.service";
import { now, serviceFixture } from "@modules/oauth/application/service/oauth-service-test.spec-support";
import { UserId } from "@modules/user/user.ids";

describe("OAuthGrantRevocationService", () => {
  let fixture: ReturnType<typeof serviceFixture>;
  let service: OAuthGrantRevocationService;
  const revoke = mockFn<IOAuthRevocationStore["revoke"]>();

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);
    revoke.mockReset();
    fixture = serviceFixture();
    fixture.context.findGrant.mockResolvedValue(fixture.grant);
    service = await testHandler(OAuthGrantRevocationService, [
      { provide: OAUTH_GRANT_STORE, useValue: fixture.store },
      { provide: OAUTH_REVOCATION_STORE, useValue: { revoke } },
    ]);
  });

  afterEach(() => jest.useRealTimers());

  it.each(["owner", "admin"])("revokes as %s under lock then invalidates tokens after commit", async (actor) => {
    const transaction = jest.spyOn(fixture.store, "transaction");
    let committed = false;
    transaction.mockImplementation(async (work) => {
      const result = await work(fixture.context);
      expect(revoke).not.toHaveBeenCalled();
      committed = true;

      return result;
    });
    revoke.mockImplementation(async () => {
      expect(committed).toBe(true);
    });

    if (actor === "owner") await service.revoke(fixture.grant.userId, fixture.grant.id);
    else await service.revokeAsAdmin(fixture.grant.id);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(fixture.context.findGrant).toHaveBeenCalledWith(fixture.grant.id, true);
    expect(fixture.context.revokeGrant).toHaveBeenCalledWith(fixture.grant.id, now);
    expect(revoke).toHaveBeenCalledWith(fixture.grant.id, fixture.grant.lastAccessExpiresAt);
  });

  it("hides another user's grant and performs no revocation", async () => {
    await expect(service.revoke(UserId.create(), fixture.grant.id)).rejects.toThrow(NotFoundException);
    expect(fixture.context.revokeGrant).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it.each(["owner", "admin"])("rejects a missing grant for %s", async (actor) => {
    fixture.context.findGrant.mockResolvedValue(null);

    const result =
      actor === "owner"
        ? service.revoke(fixture.grant.userId, fixture.grant.id)
        : service.revokeAsAdmin(fixture.grant.id);
    await expect(result).rejects.toThrow(NotFoundException);
    expect(fixture.context.revokeGrant).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });

  it.each(["read", "write", "commit"])(
    "does not invalidate cached access when the transaction fails at %s",
    async (stage) => {
      const error = new Error("Transaction failed");

      if (stage === "read") fixture.context.findGrant.mockRejectedValue(error);

      if (stage === "write") fixture.context.revokeGrant.mockRejectedValue(error);

      if (stage === "commit")
        jest.spyOn(fixture.store, "transaction").mockImplementation(async (work) => {
          await work(fixture.context);
          throw error;
        });

      await expect(service.revokeAsAdmin(fixture.grant.id)).rejects.toBe(error);
      expect(revoke).not.toHaveBeenCalled();
    }
  );

  it("propagates a revocation store failure after persisting revocation", async () => {
    const error = new Error("Redis unavailable");
    revoke.mockRejectedValue(error);
    await expect(service.revokeAsAdmin(fixture.grant.id)).rejects.toBe(error);
    expect(fixture.context.revokeGrant).toHaveBeenCalledWith(fixture.grant.id, now);
  });
});
