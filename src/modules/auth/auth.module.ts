import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RefreshCommandHandler } from "@modules/auth/application/handler/refresh.command.handler";
import { LoginCommandHandler } from "@modules/auth/application/handler/login.command.handler";
import { LogoutAllCommandHandler } from "@modules/auth/application/handler/logout-all.command.handler";
import { LogoutCommandHandler } from "@modules/auth/application/handler/logout.command.handler";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/auth/auth.tokens";
import { DbSession } from "@modules/auth/infrastructure/entity/db-session.entity";
import { DbSessionRepository } from "@modules/auth/infrastructure/repository/db-session.repository";
import { CryptoRefreshTokenService } from "@modules/auth/infrastructure/security/crypto-refresh-token-service";
import { JwtTokenService } from "@modules/auth/infrastructure/security/jwt-token-service";
import { AuthController } from "@modules/auth/presentation/controller/v1/auth.controller";
import { JwtAuthGuard } from "@modules/auth/presentation/guard/jwt-auth/jwt-auth.guard";
import { RolesGuard } from "@modules/auth/presentation/guard/roles/roles.guard";

import { CoreModule } from "@core/core.module";

export { SESSION_REPOSITORY, TOKEN_SERVICE, REFRESH_TOKEN_SERVICE } from "@modules/auth/auth.tokens";

@Module({
  imports: [
    CoreModule,
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
export class AuthModule {}
