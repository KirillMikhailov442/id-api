import { SortOrder } from "@shared/query/sort-order.enum";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class SortQuery<T extends string = string> {
  @IsOptional()
  @IsString()
  sortBy?: T;
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.ASC;
}
