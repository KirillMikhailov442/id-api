import { PaginationQuery } from "@shared/pagination/pagination.query";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

describe("PaginationQuery", () => {
  it("uses default pagination when omitted", () => {
    const query = plainToInstance(PaginationQuery, {});

    expect(query).toMatchObject({ limit: 20, offset: 0 });
    expect(validateSync(query)).toEqual([]);
  });

  it.each([
    ["1", "0"],
    ["100", "200"],
  ])("converts query strings limit=%s offset=%s", (limit, offset) => {
    const query = plainToInstance(PaginationQuery, { limit, offset });

    expect(query).toMatchObject({ limit: Number(limit), offset: Number(offset) });
    expect(validateSync(query)).toEqual([]);
  });

  it.each([
    ["limit", "0"],
    ["limit", "101"],
    ["limit", "1.5"],
    ["limit", "abc"],
    ["offset", "-1"],
    ["offset", "1.5"],
    ["offset", "abc"],
  ])("rejects %s=%s", (field, value) => {
    expect(validateSync(plainToInstance(PaginationQuery, { [field]: value })).map((error) => error.property)).toContain(
      field
    );
  });
});
