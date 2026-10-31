import { generateKeyPairSync } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  hsToken,
  issuedAt,
  rsaKeys,
  rsaToken,
  securityNow,
  tamperToken,
  testAudience,
  testClientId,
  testGrantId,
  testIssuer,
  testUserId,
  tokenHeader,
} from "@shared/testing/security-test.spec-support";

import { JwtOAuthAccessTokenService } from "@modules/oauth/infrastructure/security/jwt-oauth-access-token.service";

describe("JwtOAuthAccessTokenService", () => {
  const jwt = new JwtService();
  let service: JwtOAuthAccessTokenService;
  const settings = () => ({
    ID_TOKEN_PRIVATE_KEY: rsaKeys().privateKey,
    OAUTH_ACCESS_TTL: 900,
    APP_BASE_URL: testIssuer,
    OAUTH_AUDIENCE: testAudience,
  });
  const payload = {
    userId: testUserId,
    clientId: testClientId,
    grantId: testGrantId,
    scopes: ["user:read", "offline_access"],
  };
  const claims = () => ({
    sub: testUserId,
    client_id: testClientId,
    grant_id: testGrantId,
    scope: "user:read offline_access",
    jti: testGrantId,
    iss: testIssuer,
    aud: testAudience,
    iat: issuedAt,
    exp: issuedAt + 900,
  });

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(securityNow.getTime());
    service = new JwtOAuthAccessTokenService(jwt, new ConfigService(settings()));
  });

  afterEach(() => jest.restoreAllMocks());

  it("issues an RS256 access token with standard claims that verifies with the public key", async () => {
    const issued = await service.issue(payload);
    const verified = jwt.verify<Record<string, unknown>>(issued.token, {
      publicKey: rsaKeys().publicKey,
      algorithms: ["RS256"],
      issuer: testIssuer,
      audience: testAudience,
    });
    expect(verified).toMatchObject({ ...claims(), jti: expect.any(String) as unknown });
    expect(tokenHeader(issued.token)).toMatchObject({
      typ: "at+jwt",
      alg: "RS256",
      kid: expect.any(String) as unknown,
    });
    expect(issued.expiresAt).toEqual(new Date((issuedAt + 900) * 1000));
    expect(issued.expiresIn).toBe(900);
    await expect(service.verify(issued.token)).resolves.toEqual(payload);
  });

  it("issues unique token IDs even when all claims and the clock match", async () => {
    const first = await service.issue(payload);
    const second = await service.issue(payload);
    const options = { publicKey: rsaKeys().publicKey, algorithms: ["RS256" as const] };
    const firstClaims = jwt.verify<Record<string, unknown>>(first.token, options);
    const secondClaims = jwt.verify<Record<string, unknown>>(second.token, options);
    expect(firstClaims.jti).not.toBe(secondClaims.jti);
    expect(first.token).not.toBe(second.token);
  });

  it("accepts an independently signed token and parses space-separated scopes", async () => {
    const token = rsaToken({ ...claims(), scope: " user:read  offline_access " }, { alg: "RS256", typ: "at+jwt" });
    await expect(service.verify(token)).resolves.toEqual(payload);
  });

  it.each([
    [-1, false],
    [0, true],
    [1, true],
  ])("checks expiry at %i ms from the boundary", async (offset, expired) => {
    const token = await service.issue(payload);
    jest.spyOn(Date, "now").mockReturnValue((issuedAt + 900) * 1000 + offset);

    if (expired) await expect(service.verify(token.token)).rejects.toThrow(UnauthorizedException);
    else await expect(service.verify(token.token)).resolves.toEqual(payload);
  });

  it.each([
    "malformed",
    "tampered",
    "wrong issuer",
    "wrong audience",
    "missing issuer",
    "missing audience",
    "future nbf",
    "wrong typ",
    "HS256",
    "unsigned",
  ])("rejects %s tokens", async (state) => {
    const header = { alg: "RS256", typ: state === "wrong typ" ? "JWT" : "at+jwt" };
    const value: Record<string, unknown> = { ...claims() };

    if (state === "wrong issuer") value.iss = "https://another.example.com";

    if (state === "wrong audience") value.aud = "another-api";

    if (state === "missing issuer") delete value.iss;

    if (state === "missing audience") delete value.aud;

    if (state === "future nbf") value.nbf = issuedAt + 60;

    const valid = rsaToken(value, header);
    const token =
      state === "malformed"
        ? "not-a-jwt"
        : state === "tampered"
          ? tamperToken(valid)
          : state === "HS256"
            ? hsToken(value, { alg: "HS256", typ: "at+jwt" }, rsaKeys().publicKey)
            : state === "unsigned"
              ? `${Buffer.from('{"alg":"none","typ":"at+jwt"}').toString("base64url")}.${valid.split(".")[1]}.`
              : valid;
    await expect(service.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a token signed by an unrelated RSA key", async () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const token = await new JwtService({ privateKey: other.privateKey }).signAsync(claims(), {
      algorithm: "RS256",
      header: { alg: "RS256", typ: "at+jwt" },
    });
    await expect(service.verify(token)).rejects.toThrow(UnauthorizedException);
  });

  it.each([
    ["sub", undefined],
    ["sub", 42],
    ["sub", "invalid"],
    ["client_id", undefined],
    ["client_id", 42],
    ["client_id", "invalid"],
    ["grant_id", undefined],
    ["grant_id", 42],
    ["grant_id", "invalid"],
    ["jti", undefined],
    ["jti", 42],
    ["jti", "invalid"],
    ["scope", undefined],
    ["scope", ["user:read"]],
    ["iat", undefined],
    ["iat", "invalid"],
    ["exp", undefined],
    ["exp", "invalid"],
  ])("rejects signed invalid claim %s=%p", async (field, value) => {
    await expect(
      service.verify(rsaToken({ ...claims(), [field]: value }, { alg: "RS256", typ: "at+jwt" }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("accepts a PEM key configured with escaped newlines", async () => {
    const escaped = new JwtOAuthAccessTokenService(
      jwt,
      new ConfigService({ ...settings(), ID_TOKEN_PRIVATE_KEY: rsaKeys().privateKey.replace(/\n/g, "\\n") })
    );
    const issued = await escaped.issue(payload);
    await expect(service.verify(issued.token)).resolves.toEqual(payload);
  });

  it.each(["invalid PEM", "weak RSA", "EC"])("rejects %s signing keys", (kind) => {
    const pem =
      kind === "invalid PEM"
        ? "invalid"
        : kind === "weak RSA"
          ? generateKeyPairSync("rsa", { modulusLength: 1024 })
              .privateKey.export({ format: "pem", type: "pkcs8" })
              .toString()
          : generateKeyPairSync("ec", { namedCurve: "prime256v1" })
              .privateKey.export({ format: "pem", type: "pkcs8" })
              .toString();
    expect(
      () => new JwtOAuthAccessTokenService(jwt, new ConfigService({ ...settings(), ID_TOKEN_PRIVATE_KEY: pem }))
    ).toThrow();
  });
});
