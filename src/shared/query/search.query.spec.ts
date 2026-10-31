import { SearchQuery } from "@shared/query/search.query";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

describe("SearchQuery", () => {
  it.each([{}, { search: "" }, { search: "a".repeat(255) }])("accepts %p", (input) => {
    expect(validateSync(plainToInstance(SearchQuery, input))).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["search", 42],
    ["search", "a".repeat(256)],
  ])("rejects %s=%p", (field, value) => {
    expect(validateSync(plainToInstance(SearchQuery, { [field]: value })).map((error) => error.property)).toContain(
      field
    );
  });
});
