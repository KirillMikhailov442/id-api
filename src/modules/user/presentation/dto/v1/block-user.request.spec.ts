import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { BlockUserRequest } from "@modules/user/presentation/dto/v1/block-user.request";

describe("BlockUserRequest", () => {
  const valid = {};

  it.each([{}, { reason: "x".repeat(500) }, { reason: null }])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(BlockUserRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["reason", "x".repeat(501)],
    ["reason", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(BlockUserRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
