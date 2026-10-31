import type { Server } from "node:http";
import { VersioningType, type INestApplication, type Provider, type Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthContext, SessionAuthContext } from "@shared/auth/contract/auth-context";
import type { AuthenticatedRequest } from "@shared/auth/contract/authenticated-request.type";
import { AccessTokenType } from "@shared/auth/enum/access-token-type.enum";
import { validationExceptionFactory } from "@shared/exception/factory/validation-exception.factory";
import { ExceptionFilter } from "@shared/exception/filter/exception.filter";
import cookieParser from "cookie-parser";
import type { NextFunction, Response } from "express";

import { setupGlobalPipes } from "@config/validation";

export const testSessionAuth: SessionAuthContext = {
  type: AccessTokenType.Session,
  userId: "00000000-0000-4000-8000-000000000001",
  sessionId: "00000000-0000-4000-8000-000000000002",
  sessionVersion: 1,
  roles: [],
};

export async function controllerApp(
  controller: Type<unknown>,
  providers: Provider[],
  getAuth: () => AuthContext | undefined = () => testSessionAuth
): Promise<INestApplication<Server>> {
  const module = await Test.createTestingModule({ controllers: [controller], providers }).compile();
  const app = module.createNestApplication<INestApplication<Server>>();
  app.enableVersioning({ type: VersioningType.URI });
  app.use(cookieParser());
  app.useGlobalFilters(new ExceptionFilter());
  setupGlobalPipes(app, validationExceptionFactory);
  app.use((httpRequest: AuthenticatedRequest, _response: Response, next: NextFunction) => {
    const auth = getAuth();
    httpRequest.auth = auth;

    if (auth?.type === AccessTokenType.Session) {
      httpRequest.user = auth;
    }

    next();
  });
  await app.init();

  return app;
}
