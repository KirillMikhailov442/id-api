import { PaginationMeta } from "@shared/pagination/pagination-meta";

describe("PaginationMeta", () => {
  it.each([
    [0, 20, 0],
    [101, 10, 100],
  ])("serializes total=%i, limit=%i, offset=%i", (total, limit, offset) => {
    expect(JSON.parse(JSON.stringify(new PaginationMeta(total, limit, offset)))).toEqual({ total, limit, offset });
  });
});
