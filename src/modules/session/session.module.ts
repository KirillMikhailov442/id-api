import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessTokenResolver } from "@shared/auth/access-token-resolver";

import { ListActiveSessionsQueryHandler } from "@modules/session/application/handler/list-active-sessions.query.handler";
import { LoginCommandHandler } from "@modules/session/application/handler/login.command.handler";
import { LogoutAllCommandHandler } from "@modules/session/application/handler/logout-all.command.handler";
import { LogoutCommandHandler } from "@modules/session/application/handler/logout.command.handler";
import { RefreshCommandHandler } from "@modules/session/application/handler/refresh.command.handler";
import { RevokeSessionCommandHandler } from "@modules/session/application/handler/revoke-session.command.handler";
import { SessionIssuer } from "@modules/session/application/session-issuer";
import { DeviceInfoModule } from "@modules/session/device-info.module";
import { DbSessionRefreshToken } from "@modules/session/infrastructure/entity/db-session-refresh-token.entity";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { DbSessionRepository } from "@modules/session/infrastructure/repository/db-session.repository";
import { RedisSessionRevocationStore } from "@modules/session/infrastructure/security/redis/redis-session-revocation.store";
import { JwtAccessTokenService } from "@modules/session/infrastructure/security/token/jwt-access-token.service";
import { RefreshTokenService } from "@modules/session/infrastructure/security/token/refresh-token.service";
import { SessionAuthenticationService } from "@modules/session/infrastructure/security/token/session-authentication.service";
import { AuthController } from "@modules/session/presentation/controller/v1/auth.controller";
import { SessionController } from "@modules/session/presentation/controller/v1/session.controller";
import { SessionAccessTokenGuard } from "@modules/session/presentation/guard/session-access-token.guard";
import {
  REFRESH_TOKEN_SERVICE,
  SESSION_REPOSITORY,
  SESSION_REVOCATION_STORE,
  TOKEN_SERVICE,
} from "@modules/session/session.tokens";
import { UserModule } from "@modules/user/user.module";

import { RedisConnection } from "@config/redis";

export { SESSION_REPOSITORY, TOKEN_SERVICE, REFRESH_TOKEN_SERVICE } from "@modules/session/session.tokens";

@Module({
  imports: [
    DeviceInfoModule,
    UserModule,
    TypeOrmModule.forFeature([DbSession, DbSessionRefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      }),
    }),
  ],
  controllers: [AuthController, SessionController],
  providers: [
    SessionIssuer,
    RedisConnection,
    DbSessionRepository,
    RedisSessionRevocationStore,
    { provide: SESSION_REVOCATION_STORE, useExisting: RedisSessionRevocationStore },
    JwtAccessTokenService,
    SessionAuthenticationService,
    RefreshTokenService,
    { provide: SESSION_REPOSITORY, useExisting: DbSessionRepository },
    { provide: TOKEN_SERVICE, useExisting: JwtAccessTokenService },
    { provide: REFRESH_TOKEN_SERVICE, useExisting: RefreshTokenService },
    ListActiveSessionsQueryHandler,
    LoginCommandHandler,
    LogoutCommandHandler,
    LogoutAllCommandHandler,
    RefreshCommandHandler,
    RevokeSessionCommandHandler,
    AccessTokenResolver,
    SessionAccessTokenGuard,
  ],
  exports: [SESSION_REPOSITORY, SessionAccessTokenGuard],
})
export class SessionModule {}
