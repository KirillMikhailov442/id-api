import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { validationExceptionFactory } from "@shared/presentation/exception/factories/validation-exception.factory";
import { ExceptionFilter } from "@shared/presentation/exception/filters/exception.filter";
import cookieParser from "cookie-parser";

import { setupSwagger } from "@config/swagger";

import { AppModule } from "@app/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableVersioning({ type: VersioningType.URI });

  const globalPrefix = configService.getOrThrow<string>("API_GLOBAL_PREFIX");
  if (globalPrefix.length > 0) {
    app.setGlobalPrefix(globalPrefix);
  }

  const httpInstance = app.getHttpAdapter().getInstance() as { set: (setting: string, value: unknown) => void };
  httpInstance.set("trust proxy", 1);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    })
  );

  app.useGlobalFilters(new ExceptionFilter());

  setupSwagger(app, configService);

  const port = configService.getOrThrow<number>("PORT");
  await app.listen(port);

  const logger = new Logger("Bootstrap");
  logger.log(`Application started and is available at http://localhost:${port}`);
  const swaggerPath = configService.get<string>("SWAGGER_PATH");
  if (swaggerPath !== undefined && swaggerPath !== "") {
    logger.log(`Swagger UI is available at http://localhost:${port}/${swaggerPath}`);
  }
}
void bootstrap();
