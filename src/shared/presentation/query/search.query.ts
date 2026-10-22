import { IsOptional, IsString, MaxLength } from "class-validator";

export class SearchQuery {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
