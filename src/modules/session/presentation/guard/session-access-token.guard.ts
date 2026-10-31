import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { AccessTokenResolver } from "@shared/auth/access-token-resolver";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";

import { SessionAuthenticationService } from "@modules/session/infrastructure/security/token/session-authentication.service";

@Injectable()
export class SessionAccessTokenGuard implements CanActivate {
  constructor(
    @Inject(AccessTokenResolver) private readonly tokens: AccessTokenResolver,
    @Inject(SessionAuthenticationService) private readonly authentication: SessionAuthenticationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    delete request.auth;
    delete request.user;

    const resolved = this.tokens.resolve(context);

    if (resolved === null || resolved.type !== AccessTokenType.Session) {
      return true;
    }

    const auth = await this.authentication.authenticate(resolved.token);
    request.auth = auth;
    request.user = auth;

    return true;
  }
}
