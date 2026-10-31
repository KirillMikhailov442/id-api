import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "@shared/pagination/pagination-meta";

export class PaginationResponse<T> {
  @ApiProperty({ type: [Object] })
  items: T[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  constructor(items: T[], meta: PaginationMeta) {
    this.items = items;
    this.meta = meta;
  }
}
