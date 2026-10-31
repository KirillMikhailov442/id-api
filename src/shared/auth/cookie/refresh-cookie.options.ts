import type { ConfigService } from "@nestjs/config";
import type { CookieOptions } from "express";

export const REFRESH_TOKEN_COOKIE = "refresh_token";

const MS_PER_SECOND = 1000;

export function refreshCookieOptions(configService: ConfigService): CookieOptions {
  const ttlSeconds = configService.getOrThrow<number>("REFRESH_TOKEN_TTL");

  return {
    httpOnly: true,
    sameSite: "strict",
    secure: configService.get<string>("NODE_ENV") === "production",
    maxAge: ttlSeconds * MS_PER_SECOND,
    path: "/",
  };
}
