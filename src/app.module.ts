import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { CqrsModule } from "@nestjs/cqrs";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { TypeOrmModule } from "@nestjs/typeorm";

import { OAuthModule } from "@modules/oauth/oauth.module";
import { OAuthAccessTokenGuard } from "@modules/oauth/presentation/guard/oauth-access-token.guard";
import { RolesGuard } from "@modules/session/presentation/guard/roles.guard";
import { SessionAccessTokenGuard } from "@modules/session/presentation/guard/session-access-token.guard";
import { SessionModule } from "@modules/session/session.module";
import { UserModule } from "@modules/user/user.module";

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
    UserModule,
    SessionModule,
    OAuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: SessionAccessTokenGuard },
    { provide: APP_GUARD, useExisting: OAuthAccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
