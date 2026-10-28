import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

import {
  MAX_LENGTH as REDIRECT_URI_MAX_LENGTH,
  REDIRECT_URI_PATTERN,
} from "@modules/oauth/domain/value-object/redirect-uri.value-object";

const RESPONSE_TYPE_CODE = "code";

const STATE_MAX_LENGTH = 255;

export class AuthorizeQuery {
  @ApiProperty({ format: "uuid", example: "00000000-0000-4000-8000-000000000000" })
  @IsUUID()
  client_id: string;
  @ApiProperty({ enum: [RESPONSE_TYPE_CODE], example: RESPONSE_TYPE_CODE })
  @IsIn([RESPONSE_TYPE_CODE])
  response_type: string;
  @ApiProperty({
    maxLength: REDIRECT_URI_MAX_LENGTH,
    example: "https://pet-dashboard.example.com/auth/callback",
    pattern: REDIRECT_URI_PATTERN.source,
    description: "Must match the client location",
  })
  @IsString()
  @Length(1, REDIRECT_URI_MAX_LENGTH)
  @Matches(REDIRECT_URI_PATTERN)
  redirect_uri: string;
  @ApiProperty({ maxLength: REDIRECT_URI_MAX_LENGTH, example: "openid profile", description: "Space-separated scopes" })
  @IsString()
  @Length(1, REDIRECT_URI_MAX_LENGTH)
  scope: string;
  @ApiPropertyOptional({ maxLength: STATE_MAX_LENGTH, example: "xyz" })
  @IsOptional()
  @IsString()
  @Length(1, STATE_MAX_LENGTH)
  state?: string;
}
