import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { AuthorizeQuery } from "@modules/oauth/presentation/dto/v1/authorize.query";

describe("AuthorizeQuery", () => {
  const valid = {
    client_id: "00000000-0000-4000-8000-000000000001",
    response_type: "code",
    redirect_uri: "https://app.example.com/callback",
    scope: "openid profile",
  };

  it.each([
    {
      client_id: "00000000-0000-4000-8000-000000000001",
      response_type: "code",
      redirect_uri: "https://app.example.com/callback",
      scope: "openid profile",
    },
  ])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(AuthorizeQuery, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["client_id", "invalid"],
    ["client_id", null],
    ["response_type", "token"],
    ["response_type", ""],
    ["response_type", null],
    ["redirect_uri", ""],
    ["redirect_uri", "not-a-url"],
    ["redirect_uri", null],
    ["scope", ""],
    ["scope", null],
    ["scope", 42],
    ["state", ""],
    ["state", "x".repeat(256)],
    ["state", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(AuthorizeQuery, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
