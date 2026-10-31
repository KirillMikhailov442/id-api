import { Inject, Injectable, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { OAUTH_SCOPES_KEY } from "@shared/auth/decorator/oauth-access-token.decorator";
import { IS_PUBLIC_KEY } from "@shared/auth/decorator/public.decorator";
import { SESSION_ACCESS_TOKEN_KEY } from "@shared/auth/decorator/session-access-token.decorator";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";

@Injectable()
export class AccessTokenResolver {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  resolve(context: ExecutionContext): { token: string; type: AccessTokenType } | null {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) === true) {
      return null;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (typeof header !== "string" || !header.startsWith("Bearer ")) {
      throw new InvalidAccessTokenException("Access token is missing");
    }

    const token = header.slice(7).trim();
    const type = this.readType(token);
    const allowed = this.allowedTypes(context);

    if (!allowed.includes(type)) {
      throw new InvalidAccessTokenException("This token type is not accepted by this endpoint");
    }

    return { token, type };
  }

  private allowedTypes(context: ExecutionContext): AccessTokenType[] {
    const target = [context.getHandler(), context.getClass()].find(
      (target) =>
        this.reflector.get<boolean | undefined>(SESSION_ACCESS_TOKEN_KEY, target) !== undefined ||
        this.reflector.get<string[] | undefined>(OAUTH_SCOPES_KEY, target) !== undefined
    );

    if (target === undefined) {
      return [AccessTokenType.Session];
    }

    const allowed: AccessTokenType[] = [];

    if (this.reflector.get<boolean>(SESSION_ACCESS_TOKEN_KEY, target) === true) {
      allowed.push(AccessTokenType.Session);
    }

    if (this.reflector.get<string[] | undefined>(OAUTH_SCOPES_KEY, target) !== undefined) {
      allowed.push(AccessTokenType.OAuth);
    }

    return allowed;
  }

  private readType(token: string): AccessTokenType {
    try {
      const segments = token.split(".");

      if (segments.length !== 3 || !segments.every((segment) => /^[A-Za-z0-9_-]+$/.test(segment))) throw new Error();

      const header: unknown = JSON.parse(Buffer.from(segments[0], "base64url").toString("utf8"));

      if (header === null || typeof header !== "object" || Array.isArray(header)) throw new Error();

      const fields = header as Record<string, unknown>;

      if (fields.typ === "JWT" && fields.alg === "HS256") return AccessTokenType.Session;

      if (fields.typ === "at+jwt" && fields.alg === "RS256") return AccessTokenType.OAuth;
    } catch {
      throw new InvalidAccessTokenException();
    }

    throw new InvalidAccessTokenException("Unsupported access token type or algorithm");
  }
}
