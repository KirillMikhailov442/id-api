import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";
import {
  hsToken,
  issuedAt,
  securityNow,
  tamperToken,
  testSecret,
  testSessionId,
  testUserId,
  tokenHeader,
} from "@shared/testing/security-test.spec-support";

import { AccessTokenExpiredException } from "@modules/session/domain/exception/access-token-expired.exception";
import { JwtAccessTokenService } from "@modules/session/infrastructure/security/token/jwt-access-token.service";

describe("JwtAccessTokenService", () => {
  const jwt = new JwtService({ secret: testSecret });
  const config = new ConfigService({ JWT_ACCESS_TTL: 900 });
  const service = new JwtAccessTokenService(jwt, config);
  const payload = { userId: testUserId, sessionId: testSessionId, sessionVersion: 2, roles: ["USER", "ADMIN"] };
  const claims = () => ({
    sub: testUserId,
    sid: testSessionId,
    ver: 2,
    roles: ["USER", "ADMIN"],
    iat: issuedAt,
    exp: issuedAt + 900,
  });

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(securityNow.getTime());
  });

  afterEach(() => jest.restoreAllMocks());

  it("signs HS256 claims that can be verified independently and reports exact expiry", async () => {
    const issued = await service.issue(payload);
    expect(jwt.verify<Record<string, unknown>>(issued.token, { algorithms: ["HS256"] })).toEqual(claims());
    expect(tokenHeader(issued.token)).toEqual({ alg: "HS256", typ: "JWT" });
    expect(issued.expiresAt).toEqual(new Date((issuedAt + 900) * 1000));
    await expect(service.verify(issued.token)).resolves.toEqual(payload);
  });

  it("accepts an independently signed token and empty roles", async () => {
    await expect(service.verify(hsToken({ ...claims(), roles: [] }))).resolves.toEqual({ ...payload, roles: [] });
  });

  it.each([
    [-1, false],
    [0, true],
    [1, true],
  ])("checks expiration at %i ms from the expiry boundary", async (offset, expired) => {
    const token = hsToken(claims());
    jest.spyOn(Date, "now").mockReturnValue((issuedAt + 900) * 1000 + offset);

    if (expired) await expect(service.verify(token)).rejects.toThrow(AccessTokenExpiredException);
    else await expect(service.verify(token)).resolves.toEqual(payload);
  });

  it.each([
    "malformed",
    "bad signature",
    "tampered payload",
    "wrong algorithm",
    "unsigned",
    "future nbf",
    "wrong type",
  ])("rejects %s", async (state) => {
    const valid = hsToken(claims());
    const token =
      state === "malformed"
        ? "not-a-jwt"
        : state === "bad signature"
          ? hsToken(claims(), undefined, "another-secret")
          : state === "tampered payload"
            ? tamperToken(valid)
            : state === "wrong algorithm"
              ? hsToken(claims(), { alg: "HS512", typ: "JWT" })
              : state === "unsigned"
                ? `${Buffer.from('{"alg":"none"}').toString("base64url")}.${valid.split(".")[1]}.`
                : state === "future nbf"
                  ? hsToken({ ...claims(), nbf: issuedAt + 60 })
                  : hsToken(claims(), { alg: "HS256", typ: "at+jwt" });
    await expect(service.verify(token)).rejects.toThrow(InvalidAccessTokenException);
  });

  it.each([
    ["sub", undefined],
    ["sub", 42],
    ["sub", "invalid-uuid"],
    ["sid", undefined],
    ["sid", 42],
    ["sid", "invalid-uuid"],
    ["ver", undefined],
    ["ver", "2"],
    ["ver", 0],
    ["ver", -1],
    ["ver", 1.5],
    ["ver", Number.MAX_SAFE_INTEGER + 1],
    ["roles", undefined],
    ["roles", "ADMIN"],
    ["roles", ["USER", 42]],
    ["iat", undefined],
    ["iat", "invalid"],
    ["iat", issuedAt + 0.5],
    ["exp", undefined],
    ["exp", "invalid"],
    ["exp", issuedAt + 900.5],
  ])("rejects invalid claim %s=%p even with a valid signature", async (field, value) => {
    await expect(service.verify(hsToken({ ...claims(), [field]: value }))).rejects.toThrow(InvalidAccessTokenException);
  });

  it("uses the configured TTL", async () => {
    config.set("JWT_ACCESS_TTL", 60);

    try {
      const issued = await service.issue(payload);
      expect(issued.expiresAt).toEqual(new Date((issuedAt + 60) * 1000));
    } finally {
      config.set("JWT_ACCESS_TTL", 900);
    }
  });

  it("propagates unexpected JWT infrastructure errors", async () => {
    const error = new Error("Key provider unavailable");
    jest.spyOn(jwt, "verifyAsync").mockRejectedValueOnce(error);
    await expect(service.verify("token")).rejects.toBe(error);
    jest.spyOn(jwt, "signAsync").mockRejectedValueOnce(error);
    await expect(service.issue(payload)).rejects.toBe(error);
  });
});
