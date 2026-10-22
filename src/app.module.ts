import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { CqrsModule } from "@nestjs/cqrs";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SessionModule } from "@modules/session/session.module";
import { OAuthModule } from "@modules/oauth/oauth.module";

import { CoreModule } from "@core/core.module";

import { getTypeOrmConfig } from "@config/database";
import { registerEnvConfig } from "@config/env";
import { getThrottlerConfig } from "@config/rate-limit";

@Module({
  imports: [
    registerEnvConfig(),
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmConfig(),
    }),
    CqrsModule.forRoot({
      rethrowUnhandled: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getThrottlerConfig,
    }),
    CoreModule,
    SessionModule,
    OAuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
