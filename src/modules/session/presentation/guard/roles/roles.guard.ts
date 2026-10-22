import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { InsufficientRoleException } from "@modules/session/domain/exception/insufficient-role.exception";
import { InvalidAccessTokenException } from "@modules/session/domain/exception/invalid-access-token.exception";

import type { AuthenticatedRequest } from "@core/shared/presentation/auth/authenticated-request.type";
import { ROLES_KEY } from "@core/shared/presentation/auth/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

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
