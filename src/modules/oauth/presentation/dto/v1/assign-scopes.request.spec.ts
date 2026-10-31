import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { AssignScopesRequest } from "@modules/oauth/presentation/dto/v1/assign-scopes.request";

describe("AssignScopesRequest", () => {
  const valid = { scopes: ["openid", "user:read"] };

  it.each([{ scopes: ["openid", "user:read"] }, { scopes: Array.from({ length: 50 }, () => "profile") }])(
    "accepts valid input %p",
    (input) => {
      expect(validateSync(plainToInstance(AssignScopesRequest, input))).toEqual([]);
    }
  );

  it.each<[string, unknown]>([
    ["scopes", []],
    ["scopes", null],
    ["scopes", "openid"],
    ["scopes", [42]],
    ["scopes", ["invalid scope"]],
    ["scopes", ["x".repeat(33)]],
    ["scopes", Array.from({ length: 51 }, () => "profile")],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(AssignScopesRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
