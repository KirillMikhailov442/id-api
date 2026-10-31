import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { INestApplication, LoggerService } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule, type SwaggerCustomOptions } from "@nestjs/swagger";

import { ClientControllerSwagger } from "@modules/oauth/presentation/swagger/client-controller.swagger";
import { OAuthControllerSwagger } from "@modules/oauth/presentation/swagger/oauth-controller.swagger";
import { OAuthGrantsControllerSwagger } from "@modules/oauth/presentation/swagger/oauth-grants-controller.swagger";
import { ScopeControllerSwagger } from "@modules/oauth/presentation/swagger/scope-controller.swagger";
import { registerAuthControllerSwagger } from "@modules/session/presentation/swagger/auth-controller.swagger";
import { registerGoogleAuthControllerSwagger } from "@modules/session/presentation/swagger/google-auth-controller.swagger";
import { registerSessionControllerSwagger } from "@modules/session/presentation/swagger/session-controller.swagger";
import { registerRoleControllerSwagger } from "@modules/user/presentation/swagger/role-controller.swagger";
import { registerUserControllerSwagger } from "@modules/user/presentation/swagger/user-controller.swagger";

import { STATIC_DIRECTORY } from "@config/static";

export const SWAGGER_DEFAULT_PATH = "docs/swagger";

export function registerSwaggerControllers(): void {
  ClientControllerSwagger.register();
  OAuthControllerSwagger.register();
  OAuthGrantsControllerSwagger.register();
  ScopeControllerSwagger.register();
  registerAuthControllerSwagger();
  registerGoogleAuthControllerSwagger();
  registerSessionControllerSwagger();
  registerUserControllerSwagger();
  registerRoleControllerSwagger();
}

export function setupSwagger(app: INestApplication, configService: ConfigService): void {
  const path = configService.get<string>("SWAGGER_PATH") ?? SWAGGER_DEFAULT_PATH;

  const documentConfig = new DocumentBuilder()
    .setTitle("Mikh SSO API")
    .setDescription("SSO service for centralized user registration, authentication and account management")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);

  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: "Mikh SSO API — API Docs",
    customfavIcon: `data:image/svg+xml;base64,${readFileSync(join(STATIC_DIRECTORY, "images/favicon.svg")).toString("base64")}`,
  };

  SwaggerModule.setup(path, app, document, customOptions);
}

export function logSwaggerUrl(configService: ConfigService, logger: LoggerService): void {
  const path = configService.get<string>("SWAGGER_PATH") ?? SWAGGER_DEFAULT_PATH;

  if (path !== "") {
    const port = configService.getOrThrow<number>("PORT");

    logger.log(`Swagger UI is available at http://localhost:${port}/${path}`);
  }
}
