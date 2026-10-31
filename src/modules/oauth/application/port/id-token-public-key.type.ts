export interface IdTokenPublicKey {
  kty: "RSA";
  use: "sig";
  alg: "RS256";
  kid: string;
  n: string;
  e: string;
}
