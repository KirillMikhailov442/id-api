import type { ConfigService } from "@nestjs/config";
import type { ThrottlerModuleOptions } from "@nestjs/throttler";

export const MS_PER_SECOND = 1000;

export function getThrottlerConfig(configService: ConfigService): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        ttl: configService.getOrThrow<number>("THROTTLE_TTL") * MS_PER_SECOND,
        limit: configService.getOrThrow<number>("THROTTLE_LIMIT"),
      },
    ],
    errorMessage: "Too Many Requests",
  };
}
