import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { GoogleCallbackQuery } from "@modules/session/presentation/dto/v1/google-callback.query";

describe("GoogleCallbackQuery", () => {
  const valid = {};

  it.each([{}, { code: "x".repeat(2048), state: "x".repeat(43) }, { error: "access_denied" }])(
    "accepts valid input %p",
    (input) => {
      expect(validateSync(plainToInstance(GoogleCallbackQuery, input))).toEqual([]);
    }
  );

  it.each<[string, unknown]>([
    ["code", ""],
    ["code", "x".repeat(2049)],
    ["code", 42],
    ["state", "x".repeat(42)],
    ["state", "x".repeat(44)],
    ["state", 42],
    ["error", "x".repeat(257)],
    ["error", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(GoogleCallbackQuery, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
