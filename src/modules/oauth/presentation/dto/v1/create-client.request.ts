import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsString, Length, Matches, MaxLength, MinLength, ValidateIf } from "class-validator";

import { OAuthScope } from "@modules/oauth/domain/enum/oauth-scope.enum";
import {
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NAME_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-name.value-object";
import {
  CLIENT_SECRET_MAX_LENGTH,
  CLIENT_SECRET_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-secret.value-object";
import {
  LOCATION_HREF_MAX_LENGTH,
  LOCATION_HREF_PATTERN,
} from "@modules/oauth/domain/value-object/location-href.value-object";
import {
  SCOPE_NAME_MAX_LENGTH,
  SCOPE_NAME_MIN_LENGTH,
  SCOPE_NAME_PATTERN,
} from "@modules/oauth/domain/value-object/scope-name.value-object";

export class CreateClientRequest {
  @ApiProperty({ minLength: CLIENT_NAME_MIN_LENGTH, maxLength: CLIENT_NAME_MAX_LENGTH, example: "pet-dashboard" })
  @IsString()
  @MinLength(CLIENT_NAME_MIN_LENGTH)
  @MaxLength(CLIENT_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    minLength: CLIENT_SECRET_MIN_LENGTH,
    maxLength: CLIENT_SECRET_MAX_LENGTH,
    example: "s3cr3t-client-p@ss",
  })
  @IsString()
  @MinLength(CLIENT_SECRET_MIN_LENGTH)
  @MaxLength(CLIENT_SECRET_MAX_LENGTH)
  secret: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: LOCATION_HREF_MAX_LENGTH,
    example: "https://pet-dashboard.example.com/auth/callback",
    description: "Client callback URI",
  })
  @ValidateIf((_request: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(LOCATION_HREF_MAX_LENGTH)
  @Matches(LOCATION_HREF_PATTERN)
  location?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 50,
    example: [OAuthScope.OpenId, OAuthScope.UserRead],
    description: "Existing scope names to assign to the client; defaults to no scopes",
  })
  @ValidateIf((_request: unknown, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(SCOPE_NAME_MIN_LENGTH, SCOPE_NAME_MAX_LENGTH, { each: true })
  @Matches(SCOPE_NAME_PATTERN, { each: true })
  scopes?: string[];
}
