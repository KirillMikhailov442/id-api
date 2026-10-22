import { ApiProperty } from "@nestjs/swagger";

export class PaginationMeta {
  @ApiProperty({ minimum: 0 })
  total: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit: number;

  @ApiProperty({ minimum: 0 })
  offset: number;

  constructor(total: number, limit: number, offset: number) {
    this.total = total;
    this.limit = limit;
    this.offset = offset;
  }
}
