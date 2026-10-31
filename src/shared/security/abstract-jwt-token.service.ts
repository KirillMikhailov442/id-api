import type { JwtService, JwtSignOptions, JwtVerifyOptions } from "@nestjs/jwt";
import type { ITokenService, JwtAlgorithm } from "@shared/security/token-service";

export interface JwtTokenTiming {
  issuedAt: number;
  expiresAt: number;
  expiresIn: number;
}

interface VerifiedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

export abstract class AbstractJwtTokenService<
  TPayload,
  TIssued = string,
  TVerified = TPayload,
  TVerifyContext = void,
> implements ITokenService<TPayload, TIssued, TVerified, TVerifyContext> {
  abstract readonly algorithm: JwtAlgorithm;

  abstract readonly expiresIn: number;

  constructor(protected readonly jwtService: JwtService) {}

  async issue(payload: TPayload): Promise<TIssued> {
    const expiresIn = this.expiresIn;
    const issuedAt = Math.floor(Date.now() / 1000);
    const timing = { issuedAt, expiresAt: issuedAt + expiresIn, expiresIn };
    const token = await this.jwtService.signAsync(
      { ...this.buildClaims(payload), iat: timing.issuedAt, exp: timing.expiresAt },
      { ...this.signOptions(payload), algorithm: this.algorithm }
    );

    return this.buildResult(token, timing);
  }

  async verify(token: string, context: TVerifyContext): Promise<TVerified> {
    try {
      const result = await this.jwtService.verifyAsync<VerifiedJwt>(token, {
        ...this.verifyOptions(context),
        algorithms: [this.algorithm],
        complete: true,
      });

      return this.mapClaims(result.payload, result.header, context);
    } catch (error: unknown) {
      throw this.mapVerifyError(error);
    }
  }

  protected abstract buildClaims(payload: TPayload): Record<string, unknown>;

  protected abstract signOptions(payload: TPayload): JwtSignOptions;

  protected abstract buildResult(token: string, timing: JwtTokenTiming): TIssued;

  protected abstract verifyOptions(context: TVerifyContext): JwtVerifyOptions;

  protected abstract mapClaims(
    claims: Record<string, unknown>,
    header: Record<string, unknown>,
    context: TVerifyContext
  ): TVerified;

  protected abstract mapVerifyError(error: unknown): unknown;
}
