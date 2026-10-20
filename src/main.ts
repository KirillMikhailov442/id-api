import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { validationExceptionFactory } from "@core/shared/presentation/exception/factories/validation-exception.factory";
import { ExceptionFilter } from "@core/shared/presentation/exception/filters/exception.filter";

import { AppModule } from "@app/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    })
  );

  app.useGlobalFilters(new ExceptionFilter());

  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>("PORT");
  await app.listen(port);
}
void bootstrap();
