import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { TokenRequest } from "@modules/oauth/presentation/dto/v1/token.request";

describe("TokenRequest", () => {
  const credentials = { clientId: "00000000-0000-4000-8000-000000000001", clientSecret: "client-secret-123" };

  it.each([
    { grantType: "authorization_code", code: "code" },
    { grantType: "refresh_token", refreshToken: "refresh" },
  ])("validates the required credential for %p", (input) => {
    expect(validateSync(plainToInstance(TokenRequest, { ...credentials, ...input }))).toEqual([]);
  });

  it("transforms snake_case aliases before whitelist validation", () => {
    const request = plainToInstance(TokenRequest, {
      grant_type: "refresh_token",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: "refresh",
      redirect_uri: "https://app.example.com/callback",
    });

    expect(validateSync(request, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    expect(request).toMatchObject({
      ...credentials,
      grantType: "refresh_token",
      refreshToken: "refresh",
      redirectUri: "https://app.example.com/callback",
    });
  });

  it("prefers camelCase values when both forms are supplied", () => {
    const request = plainToInstance(TokenRequest, {
      ...credentials,
      grantType: "authorization_code",
      grant_type: "refresh_token",
      code: "code",
      client_id: "invalid",
      client_secret: "invalid",
      refreshToken: "camel",
      refresh_token: "snake",
      redirectUri: "https://camel.example.com",
      redirect_uri: "https://snake.example.com",
    });

    expect(validateSync(request)).toEqual([]);
    expect(request).toMatchObject({
      ...credentials,
      grantType: "authorization_code",
      refreshToken: "camel",
      redirectUri: "https://camel.example.com",
    });
  });

  it.each<[string, unknown]>([
    ["clientId", "invalid"],
    ["clientId", undefined],
    ["clientSecret", ""],
    ["clientSecret", 42],
    ["clientSecret", "x".repeat(65)],
    ["grantType", "password"],
    ["grantType", undefined],
    ["code", undefined],
    ["code", ""],
    ["code", 42],
    ["code", "x".repeat(256)],
    ["redirectUri", "not-a-url"],
    ["redirectUri", ""],
  ])("rejects authorization_code input %s=%p", (field, value) => {
    const request = plainToInstance(TokenRequest, {
      ...credentials,
      grantType: "authorization_code",
      code: "code",
      [field]: value,
    });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });

  it.each([undefined, "", 42, "x".repeat(256)])("requires a valid refresh token %p", (refreshToken) => {
    const request = plainToInstance(TokenRequest, { ...credentials, grantType: "refresh_token", refreshToken });

    expect(validateSync(request).map((error) => error.property)).toContain("refreshToken");
  });

  it("rejects unknown fields with strict whitelist validation", () => {
    const request = plainToInstance(TokenRequest, {
      ...credentials,
      grantType: "authorization_code",
      code: "code",
      unexpected: true,
    });

    expect(
      validateSync(request, { whitelist: true, forbidNonWhitelisted: true }).map((error) => error.property)
    ).toContain("unexpected");
  });
});
