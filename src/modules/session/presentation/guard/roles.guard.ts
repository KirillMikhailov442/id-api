import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { ROLES_KEY } from "@shared/auth/decorator/roles.decorator";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { InvalidAccessTokenException } from "@shared/exception/auth/invalid-access-token.exception";

import { InsufficientRoleException } from "@modules/session/domain/exception/insufficient-role.exception";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles === undefined || requiredRoles.length === 0) {
      return true;
    }

    const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;

    if (auth === undefined) {
      throw new InvalidAccessTokenException();
    }

    if (auth.type !== AccessTokenType.Session || !requiredRoles.some((role) => auth.roles.includes(role))) {
      throw new InsufficientRoleException();
    }

    return true;
  }
}
