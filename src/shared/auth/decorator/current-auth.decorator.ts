import { createParamDecorator, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { AuthContext } from "@shared/auth/contract/auth-context";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";

export const CurrentAuth = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;

  if (auth === undefined) throw new UnauthorizedException();

  return auth;
});
