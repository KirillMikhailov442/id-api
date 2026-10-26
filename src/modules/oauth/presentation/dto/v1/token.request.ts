import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, Length, Matches } from "class-validator";

import {
  MAX_LENGTH as SECRET_MAX_LENGTH,
  MIN_LENGTH as SECRET_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-secret.value-object";
import {
  MAX_LENGTH as REDIRECT_URI_MAX_LENGTH,
  REDIRECT_URI_PATTERN,
} from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import { GRANT_TYPE_AUTHORIZATION_CODE } from "@modules/oauth/oauth.constants";

const RAW_CODE_MAX_LENGTH = 255;

const EXAMPLE_ID = "00000000-0000-4000-8000-000000000000";

export class TokenRequest {
  @ApiProperty({ enum: [GRANT_TYPE_AUTHORIZATION_CODE], example: GRANT_TYPE_AUTHORIZATION_CODE })
  @IsIn([GRANT_TYPE_AUTHORIZATION_CODE])
  grantType: string;
  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  @IsUUID()
  clientId: string;
  @ApiProperty({ minLength: SECRET_MIN_LENGTH, maxLength: SECRET_MAX_LENGTH, example: "s3cr3t-client-p@ss" })
  @IsString()
  @Length(SECRET_MIN_LENGTH, SECRET_MAX_LENGTH)
  clientSecret: string;
  @ApiProperty({ maxLength: RAW_CODE_MAX_LENGTH, example: "3Nc9XpQaB7vFk2mZr8Tq1wLd5yHn0JcVe6SbA2RfUiM" })
  @IsString()
  @Length(1, RAW_CODE_MAX_LENGTH)
  code: string;
  @ApiPropertyOptional({
    maxLength: REDIRECT_URI_MAX_LENGTH,
    example: "https://pet-dashboard.example.com/auth/callback",
    pattern: REDIRECT_URI_PATTERN.source,
    description: "Must be equal to the redirect uri the code was issued for",
  })
  @IsOptional()
  @IsString()
  @Length(1, REDIRECT_URI_MAX_LENGTH)
  @Matches(REDIRECT_URI_PATTERN)
  redirectUri?: string;
}
