import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { CreateScopeRequest } from "@modules/oauth/presentation/dto/v1/create-scope.request";

describe("CreateScopeRequest", () => {
  const valid = { name: "openid" };

  it.each([{ name: "openid" }, { name: "user:read" }])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(CreateScopeRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["name", ""],
    ["name", "invalid scope"],
    ["name", "x".repeat(33)],
    ["name", null],
    ["name", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(CreateScopeRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
