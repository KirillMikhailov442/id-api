import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { UpdateProfileRequest } from "@modules/user/presentation/dto/v1/update-profile.request";

describe("UpdateProfileRequest", () => {
  const valid = {};

  it.each([{}, { name: "Ivan", surname: "Ivanov", email: "ivan@example.com" }])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(UpdateProfileRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["name", ""],
    ["name", "x"],
    ["name", "x".repeat(65)],
    ["name", 42],
    ["name", null],
    ["surname", ""],
    ["surname", "x"],
    ["surname", "x".repeat(65)],
    ["surname", 42],
    ["surname", null],
    ["email", "invalid"],
    ["email", ""],
    ["email", "a".repeat(255) + "@example.com"],
    ["email", 42],
    ["email", null],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(UpdateProfileRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
