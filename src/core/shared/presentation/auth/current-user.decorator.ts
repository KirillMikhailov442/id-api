import { createParamDecorator, UnauthorizedException, type ExecutionContext } from "@nestjs/common";

import type { AuthenticatedRequest } from "@core/shared/presentation/auth/authenticated-request.type";
import type { AuthenticatedUser } from "@core/shared/presentation/auth/authenticated-user.type";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

  if (request.user === undefined) {
    throw new UnauthorizedException();
  }

  return request.user;
});
