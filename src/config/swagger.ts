import type { INestApplication } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from "@nestjs/swagger";

export const SWAGGER_DEFAULT_PATH = "docs/swagger";

export function setupSwagger(app: INestApplication, configService: ConfigService): void {
  const path = configService.get<string>("SWAGGER_PATH") ?? SWAGGER_DEFAULT_PATH;

  const documentConfig = new DocumentBuilder()
    .setTitle("id-api")
    .setDescription("SSO service for centralized user registration, authentication and account management")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);

  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: "id-api — API Docs",
  };

  SwaggerModule.setup(path, app, document, customOptions);
}
