import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

import {
  MAX_LENGTH as NAME_MAX_LENGTH,
  MIN_LENGTH as NAME_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-name.value-object";
import {
  MAX_LENGTH as LOCATION_HREF_MAX_LENGTH,
  LOCATION_HREF_PATTERN,
} from "@modules/oauth/domain/value-object/location-href.value-object";

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
  @ApiPropertyOptional({
    type: String,
    maxLength: LOCATION_HREF_MAX_LENGTH,
    example: "https://pet-dashboard.example.com/auth/callback",
    description: "Replaces the client callback URI",
  })
  @ValidateIf((_request: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(LOCATION_HREF_MAX_LENGTH)
  @Matches(LOCATION_HREF_PATTERN)
  location?: string;
}
