import { ConfigService } from "@nestjs/config";
import { refreshCookieOptions } from "@shared/auth/cookie/refresh-cookie.options";

describe("refreshCookieOptions", () => {
  it.each(["production", "development", "test", undefined])("builds cookie options for %p", (environment) => {
    const config = new ConfigService({ NODE_ENV: environment, REFRESH_TOKEN_TTL: 3600 });

    expect(refreshCookieOptions(config)).toEqual({
      httpOnly: true,
      sameSite: "strict",
      secure: environment === "production",
      maxAge: 3600000,
      path: "/",
    });
  });

  it("fails when the refresh token TTL is missing", () => {
    expect(() => refreshCookieOptions(new ConfigService({}))).toThrow();
  });
});
