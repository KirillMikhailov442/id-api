import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { CreateRoleRequest } from "@modules/user/presentation/dto/v1/create-role.request";

describe("CreateRoleRequest", () => {
  const valid = { name: "USER" };

  it.each([{ name: "USER" }, { name: "ADMIN" }, { name: "SUPERUSER" }])("accepts valid input %p", (input) => {
    expect(validateSync(plainToInstance(CreateRoleRequest, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["name", "unknown"],
    ["name", "admin"],
    ["name", ""],
    ["name", null],
    ["name", 42],
  ])("rejects %s=%p", (field, value) => {
    const request = plainToInstance(CreateRoleRequest, { ...valid, [field]: value });

    expect(validateSync(request).map((error) => error.property)).toContain(field);
  });
});
