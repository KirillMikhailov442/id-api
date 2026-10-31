import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { LoginRequest } from "@modules/session/presentation/dto/v1/login.request";

describe("LoginRequest", () => {
  const valid = { email: "ivan@example.com", password: "S3cureP@ssw0rd" };

  it.each([{ email: "ivan@example.com", password: "S3cureP@ssw0rd" }])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(LoginRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["email", "invalid"],
    ["email", ""],
    ["email", "a".repeat(255) + "@example.com"],
    ["email", 42],
    ["email", null],
    ["password", ""],
    ["password", "short"],
    ["password", "alllowercase1!"],
    ["password", "ALLUPPERCASE1!"],
    ["password", "NoDigits!"],
    ["password", "NoSpecial123"],
    ["password", "Has Space1!"],
    ["password", "Пароль1!"],
    ["password", "Aa1!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"],
    ["password", null],
    ["password", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(LoginRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
