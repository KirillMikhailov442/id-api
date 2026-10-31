import { generateKeyPairSync } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  hsToken,
  issuedAt,
  publicKeyFromJwk,
  rsaKeys,
  rsaToken,
  securityNow,
  tamperToken,
  testClientId,
  testGrantId,
  testIssuer,
  testUserId,
  tokenHeader,
} from "@shared/testing/security-test.spec-support";

import { JwtIdTokenService } from "@modules/oauth/infrastructure/security/jwt-id-token.service";
import { JwtOAuthAccessTokenService } from "@modules/oauth/infrastructure/security/jwt-oauth-access-token.service";

describe("JwtIdTokenService", () => {
  const jwt = new JwtService();
  let service: JwtIdTokenService;
  const settings = () => ({ ID_TOKEN_PRIVATE_KEY: rsaKeys().privateKey, ID_TOKEN_TTL: 600, APP_BASE_URL: testIssuer });
  const payload = {
    userId: testUserId,
    clientId: testClientId,
    scopes: ["openid", "user:read"],
    profile: { name: "Ivan", surname: "Ivanov", avatar: "/assets/avatar.svg" },
  };
  const claims = () => ({
    sub: testUserId,
    scope: "openid user:read",
    name: "Ivan",
    surname: "Ivanov",
    avatar: `${testIssuer}/assets/avatar.svg`,
    aud: testClientId,
    iss: testIssuer,
    iat: issuedAt,
    exp: issuedAt + 600,
  });
  const header = () => ({ alg: "RS256", typ: "JWT", kid: service.getPublicKeys()[0].kid });

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(securityNow.getTime());
    service = new JwtIdTokenService(jwt, new ConfigService(settings()));
  });

  afterEach(() => jest.restoreAllMocks());

  it("signs ID claims with the client audience and resolves a relative avatar URL", async () => {
    const token = await service.issueIdToken(payload);
    expect(
      jwt.verify<Record<string, unknown>>(token, {
        publicKey: rsaKeys().publicKey,
        algorithms: ["RS256"],
        issuer: testIssuer,
        audience: testClientId,
      })
    ).toEqual(claims());
    expect(tokenHeader(token)).toEqual(header());
    await expect(service.verify(token, testClientId)).resolves.toEqual({
      ...payload,
      profile: { ...payload.profile, avatar: `${testIssuer}/assets/avatar.svg` },
    });
  });

  it("publishes public-only JWKS that verifies tokens and returns independent copies", async () => {
    const keys = service.getPublicKeys();
    expect(keys).toHaveLength(1);
    expect(Object.keys(keys[0]).sort()).toEqual(["alg", "e", "kid", "kty", "n", "use"]);
    expect(keys[0]).toMatchObject({ kty: "RSA", use: "sig", alg: "RS256", e: "AQAB" });

    const token = await service.issueIdToken(payload);
    expect(
      jwt.verify<Record<string, unknown>>(token, { publicKey: publicKeyFromJwk(keys[0]), algorithms: ["RS256"] }).sub
    ).toBe(testUserId);

    const original = { ...keys[0] };
    keys[0].kid = "tampered";
    keys.pop();
    expect(service.getPublicKeys()).toEqual([original]);

    const another = new JwtIdTokenService(jwt, new ConfigService(settings()));
    expect(another.getPublicKeys()[0].kid).toBe(original.kid);
  });

  it("shares a key identifier with OAuth access tokens using the same signing key", async () => {
    const oauth = new JwtOAuthAccessTokenService(
      jwt,
      new ConfigService({ ...settings(), OAUTH_ACCESS_TTL: 900, OAUTH_AUDIENCE: "api" })
    );
    const access = await oauth.issue({
      userId: testUserId,
      clientId: testClientId,
      grantId: testGrantId,
      scopes: ["user:read"],
    });
    expect(tokenHeader(access.token).kid).toBe(service.getPublicKeys()[0].kid);
    await expect(service.verify(access.token, "api")).rejects.toThrow(UnauthorizedException);
  });

  it("omits profile claims without openid even when profile data is supplied", async () => {
    const token = await service.issue({ ...payload, scopes: ["user:read"] });
    const verified = jwt.verify<Record<string, unknown>>(token, {
      publicKey: rsaKeys().publicKey,
      algorithms: ["RS256"],
    });
    expect(verified).not.toHaveProperty("name");
    expect(verified).not.toHaveProperty("surname");
    expect(verified).not.toHaveProperty("avatar");
    await expect(service.verify(token, testClientId)).resolves.toEqual({
      userId: testUserId,
      clientId: testClientId,
      scopes: ["user:read"],
    });
  });

  it("requires a profile when issuing an openid token", async () => {
    await expect(service.issue({ ...payload, profile: undefined })).rejects.toThrow("User profile is required");
  });

  it("preserves absolute avatar URLs", async () => {
    const profile = { ...payload.profile, avatar: "https://cdn.example.com/avatar.png" };
    const token = await service.issue({ ...payload, profile });
    await expect(service.verify(token, testClientId)).resolves.toMatchObject({ profile });
  });

  it("parses scope separators in independently signed tokens", async () => {
    await expect(
      service.verify(rsaToken({ ...claims(), scope: " openid  user:read " }, header()), testClientId)
    ).resolves.toMatchObject({ scopes: ["openid", "user:read"] });
  });

  it.each([
    [-1, false],
    [0, true],
    [1, true],
  ])("checks expiry at %i ms from the boundary", async (offset, expired) => {
    const token = await service.issueIdToken(payload);
    jest.spyOn(Date, "now").mockReturnValue((issuedAt + 600) * 1000 + offset);

    if (expired) await expect(service.verify(token, testClientId)).rejects.toThrow(UnauthorizedException);
    else await expect(service.verify(token, testClientId)).resolves.toMatchObject({ userId: testUserId });
  });

  it.each([undefined, null, "", 42])("requires a client verification context %p", async (clientId) => {
    const token = await service.issue(payload);
    await expect(service.verify(token, clientId as string)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects a token issued for a different client", async () => {
    const token = await service.issue(payload);
    await expect(service.verify(token, testGrantId)).rejects.toThrow(UnauthorizedException);
  });

  it.each([
    "malformed",
    "tampered",
    "wrong issuer",
    "missing issuer",
    "missing audience",
    "audience array",
    "future nbf",
    "wrong typ",
    "wrong kid",
    "missing kid",
    "HS256",
    "unsigned",
  ])("rejects %s tokens", async (state) => {
    const value: Record<string, unknown> = { ...claims() };
    const hdr: Record<string, unknown> = header();

    if (state === "wrong issuer") value.iss = "https://another.example.com";

    if (state === "missing issuer") delete value.iss;

    if (state === "missing audience") delete value.aud;

    if (state === "audience array") value.aud = [testClientId];

    if (state === "future nbf") value.nbf = issuedAt + 60;

    if (state === "wrong typ") hdr.typ = "at+jwt";

    if (state === "wrong kid") hdr.kid = "another-key";

    if (state === "missing kid") delete hdr.kid;

    const valid = rsaToken(value, hdr);
    const token =
      state === "malformed"
        ? "not-a-jwt"
        : state === "tampered"
          ? tamperToken(valid)
          : state === "HS256"
            ? hsToken(value, { alg: "HS256", typ: "JWT", kid: hdr.kid }, rsaKeys().publicKey)
            : state === "unsigned"
              ? `${Buffer.from('{"alg":"none"}').toString("base64url")}.${valid.split(".")[1]}.`
              : valid;
    await expect(service.verify(token, testClientId)).rejects.toThrow(UnauthorizedException);
  });

  it("rejects an unrelated RSA signing key even with the expected kid", async () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const token = await new JwtService({ privateKey: other.privateKey }).signAsync(claims(), {
      algorithm: "RS256",
      header: header(),
    });
    await expect(service.verify(token, testClientId)).rejects.toThrow(UnauthorizedException);
  });

  it.each([
    ["sub", undefined],
    ["sub", 42],
    ["sub", "invalid"],
    ["scope", undefined],
    ["scope", ["openid"]],
    ["iat", undefined],
    ["iat", "invalid"],
    ["iat", issuedAt + 0.5],
    ["exp", undefined],
    ["exp", "invalid"],
    ["exp", issuedAt + 600.5],
    ["name", undefined],
    ["name", 42],
    ["surname", undefined],
    ["surname", 42],
    ["avatar", undefined],
    ["avatar", 42],
  ])("rejects signed invalid claim %s=%p", async (field, value) => {
    await expect(service.verify(rsaToken({ ...claims(), [field]: value }, header()), testClientId)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("accepts escaped PEM newlines", async () => {
    const escaped = new JwtIdTokenService(
      jwt,
      new ConfigService({ ...settings(), ID_TOKEN_PRIVATE_KEY: rsaKeys().privateKey.replace(/\n/g, "\\n") })
    );
    const token = await escaped.issueIdToken(payload);
    await expect(service.verify(token, testClientId)).resolves.toMatchObject({ userId: testUserId });
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
    expect(() => new JwtIdTokenService(jwt, new ConfigService({ ...settings(), ID_TOKEN_PRIVATE_KEY: pem }))).toThrow();
  });
});
