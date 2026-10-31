import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { UpdateClientRequest } from "@modules/oauth/presentation/dto/v1/update-client.request";

describe("UpdateClientRequest", () => {
  const valid = {};

  it.each([{}, { name: "App", isActive: false, location: "https://app.example.com/callback" }])(
    "accepts valid input %p",
    (input) => {
      expect(validateSync(plainToInstance(UpdateClientRequest, input))).toEqual([]);
    }
  );

  it.each<[string, unknown]>([
    ["name", ""],
    ["name", "x".repeat(65)],
    ["name", 42],
    ["isActive", "true"],
    ["isActive", 1],
    ["location", null],
    ["location", 42],
    ["location", "not-a-url"],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(UpdateClientRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
