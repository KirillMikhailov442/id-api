import type { PaginationMeta } from "@core/shared/presentation/response/pagination-meta";

export class PaginationResponse<T> {
  items: T[];
  meta: PaginationMeta;

  constructor(items: T[], meta: PaginationMeta) {
    this.items = items;
    this.meta = meta;
  }
}
