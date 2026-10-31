import { createHmac, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";

export const securityNow = new Date("2026-01-01T00:00:00.789Z");
export const issuedAt = Math.floor(securityNow.getTime() / 1000);
export const testSecret = "local-test-signing-secret-never-used-in-production";
export const testUserId = "00000000-0000-4000-8000-000000000001";
export const testClientId = "00000000-0000-4000-8000-000000000002";
export const testSessionId = "00000000-0000-4000-8000-000000000003";
export const testGrantId = "00000000-0000-4000-8000-000000000004";
export const testIssuer = "https://identity.example.com";
export const testAudience = "test-api";

let keyPair: ReturnType<typeof generateRsa> | undefined;

function generateRsa() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

  return {
    privateKey: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
    publicKey: publicKey.export({ format: "pem", type: "spki" }).toString(),
  };
}

export function rsaKeys() {
  keyPair ??= generateRsa();

  return keyPair;
}

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
export function hsToken(
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
  secret = testSecret
) {
  const input = `${encode(header)}.${encode(claims)}`;
  const signature = createHmac(header.alg === "HS512" ? "sha512" : "sha256", secret)
    .update(input)
    .digest("base64url");

  return `${input}.${signature}`;
}
export function rsaToken(claims: Record<string, unknown>, header: Record<string, unknown>) {
  const input = `${encode(header)}.${encode(claims)}`;

  return `${input}.${sign("RSA-SHA256", Buffer.from(input), createPrivateKey(rsaKeys().privateKey)).toString("base64url")}`;
}
export function tokenHeader(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8")) as Record<string, unknown>;
}
export function tamperToken(token: string): string {
  const [header, payload, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;

  return `${header}.${encode({ ...claims, sub: "tampered-user" })}.${signature}`;
}
export function publicKeyFromJwk(jwk: { kty: string; n: string; e: string }): string {
  return createPublicKey({ key: jwk, format: "jwk" }).export({ format: "pem", type: "spki" }).toString();
}
