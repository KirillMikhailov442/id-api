import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { ROLES_KEY } from "@shared/auth/decorator/roles.decorator";

import { InsufficientRoleException } from "@modules/session/domain/exception/insufficient-role.exception";
import { InvalidAccessTokenException } from "@modules/session/domain/exception/invalid-access-token.exception";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(
    @Inject(Reflector)
    reflector: Reflector
  ) {
    this.reflector = reflector;
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles === undefined || requiredRoles.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (user === undefined) {
      throw new InvalidAccessTokenException();
    }

    if (!requiredRoles.some((role) => user.roles.includes(role))) {
      throw new InsufficientRoleException();
    }

    return true;
  }
}
