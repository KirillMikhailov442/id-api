import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";

import {
  MAX_LENGTH as NAME_MAX_LENGTH,
  MIN_LENGTH as NAME_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-name.value-object";
import {
  MAX_LENGTH as SECRET_MAX_LENGTH,
  MIN_LENGTH as SECRET_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-secret.value-object";
import {
  MAX_LENGTH as LOCATION_HREF_MAX_LENGTH,
  LOCATION_HREF_PATTERN,
} from "@modules/oauth/domain/value-object/location-href.value-object";

const MAX_LOCATIONS_PER_CLIENT = 3;

export class CreateClientRequest {
  @ApiProperty({ minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH, example: "pet-dashboard" })
  @IsString()
  @MinLength(NAME_MIN_LENGTH)
  @MaxLength(NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ minLength: SECRET_MIN_LENGTH, maxLength: SECRET_MAX_LENGTH, example: "s3cr3t-client-p@ss" })
  @IsString()
  @MinLength(SECRET_MIN_LENGTH)
  @MaxLength(SECRET_MAX_LENGTH)
  secret: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: MAX_LOCATIONS_PER_CLIENT,
    items: { maxLength: LOCATION_HREF_MAX_LENGTH },
    example: ["https://pet-dashboard.example.com/auth/callback"],
    description: "Optional client locations, up to 3",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_LOCATIONS_PER_CLIENT)
  @IsString({ each: true })
  @Length(1, LOCATION_HREF_MAX_LENGTH, { each: true })
  @Matches(LOCATION_HREF_PATTERN, { each: true })
  locations?: string[];
}
