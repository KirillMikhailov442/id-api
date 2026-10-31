import { createParamDecorator, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import type { AuthenticatedUser } from "@shared/auth/contract/authenticated-user.type";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

  if (request.auth?.type !== AccessTokenType.Session || request.user === undefined) {
    throw new UnauthorizedException();
  }

  return request.user;
});
