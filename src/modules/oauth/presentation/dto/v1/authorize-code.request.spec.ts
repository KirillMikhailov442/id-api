import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { AuthorizeCodeRequest } from "@modules/oauth/presentation/dto/v1/authorize-code.request";

describe("AuthorizeCodeRequest", () => {
  const valid = {
    clientId: "00000000-0000-4000-8000-000000000001",
    redirectUri: "https://app.example.com/callback",
    scope: "openid profile",
  };

  it.each([
    {
      clientId: "00000000-0000-4000-8000-000000000001",
      redirectUri: "https://app.example.com/callback",
      scope: "openid profile",
    },
    {
      clientId: "00000000-0000-4000-8000-000000000001",
      redirectUri: "https://app.example.com/callback",
      scope: "openid",
      state: "x".repeat(255),
    },
  ])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(AuthorizeCodeRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["clientId", "invalid"],
    ["clientId", null],
    ["redirectUri", ""],
    ["redirectUri", "not-a-url"],
    ["redirectUri", null],
    ["scope", ""],
    ["scope", null],
    ["scope", 42],
    ["state", ""],
    ["state", "x".repeat(256)],
    ["state", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(AuthorizeCodeRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
