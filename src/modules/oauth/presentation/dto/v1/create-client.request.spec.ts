import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { CreateClientRequest } from "@modules/oauth/presentation/dto/v1/create-client.request";

describe("CreateClientRequest", () => {
  const valid = { name: "Test client", secret: "client-secret-123" };

  it.each([
    { name: "Test client", secret: "client-secret-123" },
    { name: "App", secret: "client-secret-123", scopes: [], location: "https://app.example.com/callback" },
  ])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(CreateClientRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["name", ""],
    ["name", "x".repeat(65)],
    ["name", null],
    ["name", 42],
    ["secret", ""],
    ["secret", "x".repeat(65)],
    ["secret", null],
    ["secret", 42],
    ["location", null],
    ["location", 42],
    ["location", "not-a-url"],
    ["scopes", null],
    ["scopes", "profile"],
    ["scopes", [42]],
    ["scopes", ["invalid scope"]],
    ["scopes", ["x".repeat(33)]],
    ["scopes", Array.from({ length: 51 }, () => "profile")],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(CreateClientRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
