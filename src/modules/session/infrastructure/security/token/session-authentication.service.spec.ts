import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";
import { mockFn, testHandler } from "@shared/testing/handler-test.spec-support";

import { makeSession, sessionRepository } from "@modules/session/application/handler/session-test.spec-support";
import type { ISessionRevocationStore } from "@modules/session/application/port/session-revocation-store.type";
import type { AccessTokenPayload } from "@modules/session/application/port/token-service";
import { JwtAccessTokenService } from "@modules/session/infrastructure/security/token/jwt-access-token.service";
import { SessionAuthenticationService } from "@modules/session/infrastructure/security/token/session-authentication.service";
import { SessionId } from "@modules/session/session.ids";
import { SESSION_REPOSITORY, SESSION_REVOCATION_STORE } from "@modules/session/session.tokens";
import { UserId } from "@modules/user/user.ids";

describe("SessionAuthenticationService", () => {
  let session: ReturnType<typeof makeSession>;
  let repository: ReturnType<typeof sessionRepository>;
  let service: SessionAuthenticationService;
  let payload: AccessTokenPayload;
  const verify = mockFn<JwtAccessTokenService["verify"]>();
  const isRevoked = mockFn<ISessionRevocationStore["isRevoked"]>();

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));
    verify.mockReset();
    isRevoked.mockReset();
    session = makeSession();
    repository = sessionRepository();
    payload = {
      userId: session.getUserId().getValue(),
      sessionId: session.getId().getValue(),
      sessionVersion: session.getVersion(),
      roles: ["USER"],
    };
    verify.mockResolvedValue(payload);
    isRevoked.mockResolvedValue(false);
    repository.findById.mockResolvedValue(session);
    service = await testHandler(SessionAuthenticationService, [
      { provide: JwtAccessTokenService, useValue: { verify } },
      { provide: SESSION_REPOSITORY, useValue: repository },
      { provide: SESSION_REVOCATION_STORE, useValue: { isRevoked } },
    ]);
  });

  afterEach(() => jest.useRealTimers());

  it("returns the verified session identity after checking revocation and the persisted session", async () => {
    await expect(service.authenticate("access-token")).resolves.toEqual({ ...payload, type: AccessTokenType.Session });
    expect(verify).toHaveBeenCalledWith("access-token");
    expect(isRevoked).toHaveBeenCalledWith(SessionId.from(payload.sessionId), payload.sessionVersion);
    expect(repository.findById).toHaveBeenCalledWith(session.getId());
  });

  it("rejects revoked versions before looking up the session", async () => {
    isRevoked.mockResolvedValue(true);
    await expect(service.authenticate("access-token")).rejects.toThrow(InvalidAccessTokenException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it.each(["missing", "revoked", "expired", "expiry boundary", "wrong user", "old version", "future version"])(
    "rejects %s sessions",
    async (state) => {
      if (state === "missing") repository.findById.mockResolvedValue(null);

      if (state === "revoked") session.revoke();

      if (state === "expired") jest.setSystemTime(new Date(session.getExpiresAt().getTime() + 1));

      if (state === "expiry boundary") jest.setSystemTime(session.getExpiresAt());

      if (state === "wrong user") payload.userId = UserId.create().getValue();

      if (state === "old version") {
        session.rotate({
          browser: null,
          os: null,
          deviceType: null,
          ip: session.getIp(),
          expiresAt: session.getExpiresAt(),
          now: new Date(),
        });
      }

      if (state === "future version") payload.sessionVersion = 2;

      await expect(service.authenticate("access-token")).rejects.toThrow(InvalidAccessTokenException);
    }
  );

  it("accepts a token at the current version of a rotated session", async () => {
    session.rotate({
      browser: null,
      os: null,
      deviceType: null,
      ip: session.getIp(),
      expiresAt: session.getExpiresAt(),
      now: new Date(),
    });
    payload.sessionVersion = session.getVersion();
    await expect(service.authenticate("access-token")).resolves.toMatchObject({ sessionVersion: 2 });
  });

  it("accepts a session one millisecond before expiry", async () => {
    jest.setSystemTime(new Date(session.getExpiresAt().getTime() - 1));
    await expect(service.authenticate("access-token")).resolves.toMatchObject({ type: AccessTokenType.Session });
  });

  it.each(["jwt", "revocation store", "session store"])("propagates %s failures", async (stage) => {
    const error = new Error("Dependency failed");

    if (stage === "jwt") verify.mockRejectedValue(error);

    if (stage === "revocation store") isRevoked.mockRejectedValue(error);

    if (stage === "session store") repository.findById.mockRejectedValue(error);

    await expect(service.authenticate("access-token")).rejects.toBe(error);

    if (stage === "jwt") expect(isRevoked).not.toHaveBeenCalled();

    if (stage !== "session store") expect(repository.findById).not.toHaveBeenCalled();
  });
});
