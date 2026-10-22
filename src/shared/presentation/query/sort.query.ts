import { IsEnum, IsOptional, IsString } from "class-validator";

import { SortOrder } from "@shared/presentation/query/sort-order.enum";

export class SortQuery<T extends string = string> {
  @IsOptional()
  @IsString()
  sortBy?: T;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}
