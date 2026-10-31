import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  hsToken,
  issuedAt,
  securityNow,
  tamperToken,
  testSecret,
  testUserId,
} from "@shared/testing/security-test.spec-support";

import { InvalidEmailConfirmationTokenException } from "@modules/user/domain/exception/invalid-email-confirmation-token.exception";
import { JwtEmailConfirmationTokenService } from "@modules/user/infrastructure/security/jwt-email-confirmation-token.service";

describe("JwtEmailConfirmationTokenService", () => {
  const jwt = new JwtService({ secret: testSecret });
  const service = new JwtEmailConfirmationTokenService(jwt, new ConfigService({ EMAIL_CONFIRM_TTL: 3600 }));
  const payload = { userId: testUserId, email: "ivan@example.com" };
  const claims = () => ({
    sub: testUserId,
    email: payload.email,
    aud: "email-confirmation",
    iat: issuedAt,
    exp: issuedAt + 3600,
  });

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(securityNow.getTime());
  });

  afterEach(() => jest.restoreAllMocks());

  it("signs a confirmation token with a dedicated audience and round-trips the payload", async () => {
    const token = await service.issue(payload);
    expect(
      jwt.verify<Record<string, unknown>>(token, { algorithms: ["HS256"], audience: "email-confirmation" })
    ).toEqual(claims());
    await expect(service.verify(token)).resolves.toEqual(payload);
  });

  it.each([
    [-1, false],
    [0, true],
    [1, true],
  ])("checks expiry at %i ms from the boundary", async (offset, expired) => {
    jest.spyOn(Date, "now").mockReturnValue((issuedAt + 3600) * 1000 + offset);

    const result = service.verify(hsToken(claims()));

    if (expired) {
      await expect(result).rejects.toThrow(InvalidEmailConfirmationTokenException);
      await expect(result).rejects.toThrow("Email confirmation token is expired");
    } else await expect(result).resolves.toEqual(payload);
  });

  it.each([
    "malformed",
    "bad signature",
    "tampered",
    "wrong audience",
    "missing audience",
    "wrong algorithm",
    "future nbf",
  ])("rejects %s tokens", async (state) => {
    const token =
      state === "malformed"
        ? "invalid"
        : state === "bad signature"
          ? hsToken(claims(), undefined, "wrong-secret")
          : state === "tampered"
            ? tamperToken(hsToken(claims()))
            : state === "wrong audience"
              ? hsToken({ ...claims(), aud: "access-token" })
              : state === "missing audience"
                ? hsToken({ ...claims(), aud: undefined })
                : state === "wrong algorithm"
                  ? hsToken(claims(), { alg: "HS512", typ: "JWT" })
                  : hsToken({ ...claims(), nbf: issuedAt + 60 });
    await expect(service.verify(token)).rejects.toThrow(InvalidEmailConfirmationTokenException);
  });

  it.each([
    ["sub", undefined],
    ["sub", ""],
    ["sub", 42],
    ["sub", null],
    ["email", undefined],
    ["email", ""],
    ["email", 42],
    ["email", null],
  ])("rejects invalid %s=%p despite a valid signature", async (field, value) => {
    await expect(service.verify(hsToken({ ...claims(), [field]: value }))).rejects.toThrow(
      InvalidEmailConfirmationTokenException
    );
  });

  it("propagates unexpected JWT failures", async () => {
    const error = new Error("Signing service unavailable");
    jest.spyOn(jwt, "verifyAsync").mockRejectedValueOnce(error);
    await expect(service.verify("token")).rejects.toBe(error);
    jest.spyOn(jwt, "signAsync").mockRejectedValueOnce(error);
    await expect(service.issue(payload)).rejects.toBe(error);
  });
});
