import { Body, Controller, Cookies, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "@shared/presentation/auth/public.decorator";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@shared/presentation/auth/refresh-cookie.options";
import type { Request, Response } from "express";

import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import { LogoutAllCommand } from "@modules/session/application/command/logout-all.command";
import { LogoutCommand } from "@modules/session/application/command/logout.command";
import { RefreshCommand, type RefreshResult } from "@modules/session/application/command/refresh.command";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { LoginRequest } from "@modules/session/presentation/dto/v1/login.request";
import { LoginResponse } from "@modules/session/presentation/dto/v1/login.response";
import { RefreshResponse } from "@modules/session/presentation/dto/v1/refresh.response";
import {
  ApiInvalidCredentialsResponse,
  ApiInvalidRefreshTokenResponse,
  ApiUserBlockedResponse,
} from "@modules/session/presentation/exception-response.decorator";

const UNKNOWN_VALUE = "unknown";

@ApiTags("auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  private readonly commandBus: CommandBus;
  private readonly configService: ConfigService;

  constructor(commandBus: CommandBus, configService: ConfigService) {
    this.commandBus = commandBus;
    this.configService = configService;
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOkResponse({
    type: LoginResponse,
    description: "User authenticated. Refresh token is set as httpOnly cookie 'refresh_token'",
  })
  @ApiInvalidCredentialsResponse()
  @ApiUserBlockedResponse()
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
      httpRequest.headers["user-agent"] ?? UNKNOWN_VALUE,
      httpRequest.ip ?? UNKNOWN_VALUE
    );
    const result = await this.commandBus.execute<LoginCommand, LoginResult>(command);
    httpResponse.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshCookieOptions(this.configService));
    return new LoginResponse(result.accessToken);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: RefreshResponse,
    description: "Access token refreshed. New refresh token is set as httpOnly cookie 'refresh_token'",
  })
  @ApiInvalidRefreshTokenResponse()
  @ApiUserBlockedResponse()
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
        httpRequest.headers["user-agent"] ?? UNKNOWN_VALUE,
        httpRequest.ip ?? UNKNOWN_VALUE
      )
    );
    httpResponse.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshCookieOptions(this.configService));
    return new RefreshResponse(result.accessToken);
  }

  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Current session revoked" })
  @ApiInvalidRefreshTokenResponse()
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

  @ApiBearerAuth()
  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "All user sessions revoked" })
  @ApiInvalidRefreshTokenResponse()
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
