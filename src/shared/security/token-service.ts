export type JwtAlgorithm = "HS256" | "RS256";

export interface ITokenService<TPayload, TIssued = string, TVerified = TPayload, TVerifyContext = void> {
  readonly algorithm: JwtAlgorithm;
  readonly expiresIn: number;
  readonly issuer?: string;
  readonly audience?: string;

  issue(payload: TPayload): Promise<TIssued>;
  verify(token: string, context: TVerifyContext): Promise<TVerified>;
}
