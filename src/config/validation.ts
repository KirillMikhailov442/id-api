import { ValidationPipe, type INestApplication, type ValidationPipeOptions } from "@nestjs/common";

export function setupGlobalPipes(
  app: INestApplication,
  exceptionFactory: NonNullable<ValidationPipeOptions["exceptionFactory"]>
): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory,
    })
  );
}
