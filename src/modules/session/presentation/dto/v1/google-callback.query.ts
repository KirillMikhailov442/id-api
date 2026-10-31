import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class GoogleCallbackQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(43)
  @MaxLength(43)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  error?: string;
}
