import type { INestApplication } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

export function setupCors(app: INestApplication, configService: ConfigService): void {
  app.enableCors({
    origin: new URL(configService.getOrThrow<string>("APP_WEB_URL")).origin,
    credentials: true,
  });
}
