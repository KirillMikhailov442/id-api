import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { ConfirmEmailQuery } from "@modules/user/presentation/dto/v1/confirm-email.query";

describe("ConfirmEmailQuery", () => {
  const valid = { token: "confirmation-token" };

  it.each([{ token: "confirmation-token" }])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(ConfirmEmailQuery, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["token", ""],
    ["token", null],
    ["token", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(ConfirmEmailQuery, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
