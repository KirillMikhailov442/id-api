export class PaginationMeta {
  total: number;
  limit: number;
  offset: number;

  constructor(total: number, limit: number, offset: number) {
    this.total = total;
    this.limit = limit;
    this.offset = offset;
  }
}
