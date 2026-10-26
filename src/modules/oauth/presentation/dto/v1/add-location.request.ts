import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength } from "class-validator";

import {
  MAX_LENGTH as LOCATION_HREF_MAX_LENGTH,
  LOCATION_HREF_PATTERN,
} from "@modules/oauth/domain/value-object/location-href.value-object";

export class AddLocationRequest {
  @ApiProperty({
    maxLength: LOCATION_HREF_MAX_LENGTH,
    example: "https://pet-dashboard.example.com/auth/callback",
    pattern: LOCATION_HREF_PATTERN.source,
  })
  @IsString()
  @MaxLength(LOCATION_HREF_MAX_LENGTH)
  @Matches(LOCATION_HREF_PATTERN)
  href: string;
}
