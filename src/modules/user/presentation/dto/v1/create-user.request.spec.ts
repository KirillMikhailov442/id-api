import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { CreateUserRequest } from "@modules/user/presentation/dto/v1/create-user.request";

describe("CreateUserRequest", () => {
  const valid = { name: "Ivan", surname: "Ivanov", email: "ivan@example.com", password: "S3cureP@ssw0rd" };

  it.each([{ name: "Ivan", surname: "Ivanov", email: "ivan@example.com", password: "S3cureP@ssw0rd" }])(
    "accepts valid input %p",
    (input) => {
      expect(validateSync(plainToInstance(CreateUserRequest, input))).toEqual([]);
    }
  );

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
    const request = plainToInstance(CreateUserRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
