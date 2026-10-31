import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { ChangePasswordRequest } from "@modules/user/presentation/dto/v1/change-password.request";

describe("ChangePasswordRequest", () => {
  const valid = { oldPassword: "Old1!Password", newPassword: "S3cureP@ssw0rd" };

  it.each([{ oldPassword: "Old1!Password", newPassword: "S3cureP@ssw0rd" }])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(ChangePasswordRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["oldPassword", ""],
    ["oldPassword", 42],
    ["oldPassword", null],
    ["newPassword", ""],
    ["newPassword", "short"],
    ["newPassword", "alllowercase1!"],
    ["newPassword", "ALLUPPERCASE1!"],
    ["newPassword", "NoDigits!"],
    ["newPassword", "NoSpecial123"],
    ["newPassword", "Has Space1!"],
    ["newPassword", "Пароль1!"],
    ["newPassword", "Aa1!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"],
    ["newPassword", null],
    ["newPassword", 42],
    ["newPassword", "Old1!Password"],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(ChangePasswordRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
