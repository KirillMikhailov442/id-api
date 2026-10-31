import { Controller, Cookies, Get, Header, Inject, Query, Req, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandBus } from "@nestjs/cqrs";
import { Throttle } from "@nestjs/throttler";
import { REFRESH_TOKEN_COOKIE, refreshCookieOptions } from "@shared/auth/cookie/refresh-cookie.options";
import { Public } from "@shared/auth/decorator/public.decorator";
import type { CookieOptions, Request, Response } from "express";

import { LoginWithGoogleCommand } from "@modules/session/application/command/login-with-google.command";
import type { LoginResult } from "@modules/session/application/command/login.command";
import {
  StartGoogleLoginCommand,
  type StartGoogleLoginResult,
} from "@modules/session/application/command/start-google-login.command";
import { DeviceInfoParser } from "@modules/session/infrastructure/device/device-info-parser";
import { GoogleCallbackQuery } from "@modules/session/presentation/dto/v1/google-callback.query";

const LOGIN_COOKIE = "google_login";

@Controller({ path: "auth/google", version: "1" })
export class GoogleAuthController {
  constructor(
    @Inject(CommandBus) private readonly commandBus: CommandBus,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(DeviceInfoParser) private readonly deviceInfoParser: DeviceInfoParser
  ) {}

  @Public()
  @Get()
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async start(@Res() response: Response): Promise<void> {
    const result = await this.commandBus.execute<StartGoogleLoginCommand, StartGoogleLoginResult>(
      new StartGoogleLoginCommand()
    );
    response.cookie(LOGIN_COOKIE, result.browserBinding, {
      ...this.loginCookieOptions(),
      maxAge: this.config.getOrThrow<number>("EXTERNAL_LOGIN_TTL") * 1000,
    });
    response.redirect(result.authorizationUrl);
  }

  @Public()
  @Get("callback")
  @Header("Cache-Control", "no-store")
  @Header("Referrer-Policy", "no-referrer")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async callback(
    @Query() query: GoogleCallbackQuery,
    @Cookies(LOGIN_COOKIE) browserBinding: string | undefined,
    @Req() request: Request,
    @Res() response: Response
  ): Promise<void> {
    response.clearCookie(LOGIN_COOKIE, this.loginCookieOptions());

    const result = await this.commandBus.execute<LoginWithGoogleCommand, LoginResult>(
      new LoginWithGoogleCommand(
        this.deviceInfoParser.parse(request.headers),
        request.ip ?? "unknown",
        query.state,
        query.code,
        query.error,
        browserBinding
      )
    );
    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, refreshCookieOptions(this.config));
    response.redirect(this.config.getOrThrow<string>("APP_WEB_URL"));
  }

  private loginCookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: "lax", secure: this.config.get<string>("NODE_ENV") === "production", path: "/" };
  }
}
