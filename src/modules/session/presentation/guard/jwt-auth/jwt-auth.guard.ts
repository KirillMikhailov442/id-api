import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { IS_PUBLIC_KEY } from "@shared/auth/decorator/public.decorator";

import type { ITokenService } from "@modules/session/application/port/token-service";
import { InvalidAccessTokenException } from "@modules/session/domain/exception/invalid-access-token.exception";
import { TOKEN_SERVICE } from "@modules/session/session.tokens";

const AUTHORIZATION_HEADER = "authorization";

const BEARER_PREFIX = "Bearer ";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly tokenService: ITokenService;
  private readonly reflector: Reflector;

  constructor(
    @Inject(TOKEN_SERVICE)
    tokenService: ITokenService,
    @Inject(Reflector)
    reflector: Reflector
  ) {
    this.tokenService = tokenService;
    this.reflector = reflector;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (token === null) {
      throw new InvalidAccessTokenException("Access token is missing");
    }

    request.user = await this.tokenService.verifyAccessToken(token);
    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const header = request.headers[AUTHORIZATION_HEADER];

    if (typeof header !== "string" || !header.startsWith(BEARER_PREFIX)) {
      return null;
    }

    const token = header.slice(BEARER_PREFIX.length).trim();
    return token.length === 0 ? null : token;
  }
}
