import { ConfigModule } from "@nestjs/config";
import { plainToInstance } from "class-transformer";
import { IsInt, IsString, Min, validateSync } from "class-validator";

class EnvironmentVariables {
  @IsInt()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  DB_HOST: string;

  @IsInt()
  @Min(1)
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  SWAGGER_PATH: string = "docs/swagger";

  @IsString()
  NODE_ENV: string = "development";

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsInt()
  @Min(1)
  JWT_ACCESS_TTL: number = 900;

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL: number = 2592000;

  @IsInt()
  @Min(1)
  THROTTLE_TTL: number = 60;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 100;

  @IsString()
  API_GLOBAL_PREFIX: string = "api";
}

function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed: ${errors
        .map((error) => Object.values(error.constraints ?? {}).join("; "))
        .join(" | ")}`
    );
  }

  return validatedConfig as unknown as Record<string, unknown>;
}

export function registerEnvConfig() {
  return ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [`.env.${process.env.NODE_ENV}`, ".env"],
    validate: validateEnv,
  });
}
