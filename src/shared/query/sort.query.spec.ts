import { SortOrder } from "@shared/query/sort-order.enum";
import { SortQuery } from "@shared/query/sort.query";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

describe("SortQuery", () => {
  it.each([{}, { sortBy: "createdAt", sortOrder: SortOrder.DESC }])("accepts %p", (input) => {
    expect(validateSync(plainToInstance(SortQuery, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["sortBy", 42],
    ["sortOrder", "invalid"],
  ])("rejects %s=%p", (field, value) => {
    expect(validateSync(plainToInstance(SortQuery, { [field]: value })).map((error) => error.property)).toContain(
      field
    );
  });
});
