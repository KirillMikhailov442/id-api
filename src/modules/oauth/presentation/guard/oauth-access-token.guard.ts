import { ForbiddenException, Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AccessTokenResolver } from "@shared/auth/access-token-resolver";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { OAUTH_SCOPES_KEY } from "@shared/auth/decorator/oauth-access-token.decorator";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";

import { OAuthAuthorizationService } from "@modules/oauth/application/service/oauth-authorization.service";

@Injectable()
export class OAuthAccessTokenGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AccessTokenResolver) private readonly tokens: AccessTokenResolver,
    @Inject(OAuthAuthorizationService) private readonly authorization: OAuthAuthorizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resolved = this.tokens.resolve(context);

    if (resolved === null || resolved.type !== AccessTokenType.OAuth) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<string[]>(OAUTH_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required === undefined || required.length === 0) {
      throw new ForbiddenException("OAuth scope requirements are missing");
    }

    const auth = await this.authorization.authorize(resolved.token, required);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.auth = auth;

    return true;
  }
}
