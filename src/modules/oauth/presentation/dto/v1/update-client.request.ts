import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

import {
  MAX_LENGTH as NAME_MAX_LENGTH,
  MIN_LENGTH as NAME_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-name.value-object";

export class UpdateClientRequest {
  @ApiPropertyOptional({ minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH, example: "pet-dashboard" })
  @IsOptional()
  @IsString()
  @MinLength(NAME_MIN_LENGTH)
  @MaxLength(NAME_MAX_LENGTH)
  name?: string;
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
