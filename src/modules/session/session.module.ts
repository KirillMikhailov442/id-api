import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { LoginCommandHandler } from "@modules/session/application/handler/login.command.handler";
import { LogoutAllCommandHandler } from "@modules/session/application/handler/logout-all.command.handler";
import { LogoutCommandHandler } from "@modules/session/application/handler/logout.command.handler";
import { RefreshCommandHandler } from "@modules/session/application/handler/refresh.command.handler";
import { DbSession } from "@modules/session/infrastructure/entity/db-session.entity";
import { DbSessionRepository } from "@modules/session/infrastructure/repository/db-session.repository";
import { CryptoRefreshTokenService } from "@modules/session/infrastructure/security/crypto-refresh-token-service";
import { JwtTokenService } from "@modules/session/infrastructure/security/jwt-token-service";
import { AuthController } from "@modules/session/presentation/controller/v1/auth.controller";
import { JwtAuthGuard } from "@modules/session/presentation/guard/jwt-auth/jwt-auth.guard";
import { RolesGuard } from "@modules/session/presentation/guard/roles/roles.guard";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/session/session.tokens";
import { UserModule } from "@modules/user/user.module";

export { SESSION_REPOSITORY, TOKEN_SERVICE, REFRESH_TOKEN_SERVICE } from "@modules/session/session.tokens";

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([DbSession]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    DbSessionRepository,
    JwtTokenService,
    CryptoRefreshTokenService,
    { provide: SESSION_REPOSITORY, useExisting: DbSessionRepository },
    { provide: TOKEN_SERVICE, useExisting: JwtTokenService },
    { provide: REFRESH_TOKEN_SERVICE, useExisting: CryptoRefreshTokenService },
    LoginCommandHandler,
    LogoutCommandHandler,
    LogoutAllCommandHandler,
    RefreshCommandHandler,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [SESSION_REPOSITORY],
})
export class SessionModule {}
