import { Body, Controller, Cookies, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { Throttle } from "@nestjs/throttler";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@shared/auth/cookie/refresh-cookie.options";
import { Public } from "@shared/auth/decorator/public.decorator";
import type { Request, Response } from "express";

import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import { LogoutAllCommand } from "@modules/session/application/command/logout-all.command";
import { LogoutCommand } from "@modules/session/application/command/logout.command";
import { RefreshCommand, type RefreshResult } from "@modules/session/application/command/refresh.command";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { DeviceInfoParser } from "@modules/session/infrastructure/device/device-info-parser";
import { LoginRequest } from "@modules/session/presentation/dto/v1/login.request";
import { LoginResponse } from "@modules/session/presentation/dto/v1/login.response";
import { RefreshResponse } from "@modules/session/presentation/dto/v1/refresh.response";

const UNKNOWN_VALUE = "unknown";

@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
    private readonly deviceInfoParser: DeviceInfoParser
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body()
    request: LoginRequest,
    @Req()
    httpRequest: Request,
    @Res({ passthrough: true })
    httpResponse: Response
  ): Promise<LoginResponse> {
    const command = new LoginCommand(
      request.email,
      request.password,
      this.deviceInfoParser.parse(httpRequest.headers),
      httpRequest.ip ?? UNKNOWN_VALUE
    );
    const result = await this.commandBus.execute<LoginCommand, LoginResult>(command);
    httpResponse.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshCookieOptions(this.configService));

    return new LoginResponse(result.accessToken);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Cookies(REFRESH_TOKEN_COOKIE)
    refreshToken: string | undefined,
    @Req()
    httpRequest: Request,
    @Res({ passthrough: true })
    httpResponse: Response
  ): Promise<RefreshResponse> {
    if (refreshToken === undefined) {
      throw new InvalidRefreshTokenException("Refresh token cookie is missing");
    }

    const result = await this.commandBus.execute<RefreshCommand, RefreshResult>(
      new RefreshCommand(
        refreshToken,
        this.deviceInfoParser.parse(httpRequest.headers),
        httpRequest.ip ?? UNKNOWN_VALUE
      )
    );
    httpResponse.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshCookieOptions(this.configService));

    return new RefreshResponse(result.accessToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Cookies(REFRESH_TOKEN_COOKIE)
    refreshToken: string | undefined,
    @Res({ passthrough: true })
    httpResponse: Response
  ): Promise<void> {
    if (refreshToken === undefined) {
      throw new InvalidRefreshTokenException("Refresh token cookie is missing");
    }

    await this.commandBus.execute<LogoutCommand, void>(new LogoutCommand(refreshToken));
    httpResponse.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(this.configService));
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Cookies(REFRESH_TOKEN_COOKIE)
    refreshToken: string | undefined,
    @Res({ passthrough: true })
    httpResponse: Response
  ): Promise<void> {
    if (refreshToken === undefined) {
      throw new InvalidRefreshTokenException("Refresh token cookie is missing");
    }

    await this.commandBus.execute<LogoutAllCommand, void>(new LogoutAllCommand(refreshToken));
    httpResponse.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(this.configService));
  }
}
