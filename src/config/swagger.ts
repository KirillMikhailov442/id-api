import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule, type SwaggerCustomOptions } from "@nestjs/swagger";

export const SWAGGER_DEFAULT_PATH = "docs/swagger";

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
    customfavIcon: `data:image/svg+xml;base64,${readFileSync(join(__dirname, "assets/favicon.svg")).toString("base64")}`,
  };

  SwaggerModule.setup(path, app, document, customOptions);
}
