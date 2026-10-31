import "reflect-metadata";

import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";
import type { OAuthAuthContext, SessionAuthContext } from "@shared/auth/contract/auth-context";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";

export function authContext(authorization?: string) {
  class Controller {}

  const handler = () => undefined;
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const context = new ExecutionContextHost([request], Controller, handler);
  context.setType("http");

  return { request, context, controller: Controller, handler };
}
export function sessionAuth(roles: string[] = []): SessionAuthContext {
  return {
    type: AccessTokenType.Session,
    userId: "00000000-0000-4000-8000-000000000001",
    sessionId: "00000000-0000-4000-8000-000000000002",
    sessionVersion: 1,
    roles,
  };
}
export function oauthAuth(scopes: string[] = ["profile:read"]): OAuthAuthContext {
  return {
    type: AccessTokenType.OAuth,
    userId: "00000000-0000-4000-8000-000000000001",
    clientId: "00000000-0000-4000-8000-000000000003",
    grantId: "00000000-0000-4000-8000-000000000004",
    scopes,
  };
}
export function accessToken(type: AccessTokenType): string {
  const header = type === AccessTokenType.Session ? { typ: "JWT", alg: "HS256" } : { typ: "at+jwt", alg: "RS256" };

  return `${Buffer.from(JSON.stringify(header)).toString("base64url")}.e30.c2ln`;
}
