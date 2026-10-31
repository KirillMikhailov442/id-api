import { Logger, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { validationExceptionFactory } from "@shared/exception/factory/validation-exception.factory";
import { ExceptionFilter } from "@shared/exception/filter/exception.filter";
import cookieParser from "cookie-parser";

import { setupCors } from "@config/cors";
import { setupStaticAssets } from "@config/static";
import { logSwaggerUrl, registerSwaggerControllers, setupSwagger } from "@config/swagger";
import { setupGlobalPipes } from "@config/validation";

import { AppModule } from "@app/app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const globalPrefix = configService.getOrThrow<string>("API_GLOBAL_PREFIX");
  const port = configService.getOrThrow<number>("PORT");
  const httpInstance = app.getHttpAdapter().getInstance() as { set: (setting: string, value: unknown) => void };
  httpInstance.set("trust proxy", 1);

  app.setGlobalPrefix(globalPrefix);
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalFilters(new ExceptionFilter());
  app.use(cookieParser());

  setupStaticAssets(app);
  setupCors(app, configService);
  registerSwaggerControllers();
  setupSwagger(app, configService);
  setupGlobalPipes(app, validationExceptionFactory);

  await app.listen(port, () => {
    const logger = new Logger("Bootstrap");
    logger.log(`Application started and is available at http://localhost:${port}`);

    logSwaggerUrl(configService, logger);
  });
}

void bootstrap();
