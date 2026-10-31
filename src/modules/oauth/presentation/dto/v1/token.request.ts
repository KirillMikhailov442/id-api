import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { Allow, IsIn, IsOptional, IsString, IsUUID, Length, Matches, ValidateIf } from "class-validator";

import {
  CLIENT_SECRET_MAX_LENGTH,
  CLIENT_SECRET_MIN_LENGTH,
} from "@modules/oauth/domain/value-object/client-secret.value-object";
import {
  REDIRECT_URI_MAX_LENGTH,
  REDIRECT_URI_PATTERN,
} from "@modules/oauth/domain/value-object/redirect-uri.value-object";
import {
  GRANT_TYPE_AUTHORIZATION_CODE,
  GRANT_TYPE_REFRESH_TOKEN,
} from "@modules/oauth/presentation/constants/oauth-grant-type.constants";

const RAW_CODE_MAX_LENGTH = 255;

const EXAMPLE_ID = "00000000-0000-4000-8000-000000000000";

const fromAlias =
  (alias: string) =>
  ({ value, obj }: { value: unknown; obj: Record<string, unknown> }): unknown =>
    value ?? obj[alias];

export class TokenRequest {
  @ApiProperty({
    enum: [GRANT_TYPE_AUTHORIZATION_CODE, GRANT_TYPE_REFRESH_TOKEN],
    example: GRANT_TYPE_AUTHORIZATION_CODE,
  })
  @Expose()
  @Transform(fromAlias("grant_type"))
  @IsIn([GRANT_TYPE_AUTHORIZATION_CODE, GRANT_TYPE_REFRESH_TOKEN])
  grantType: string;

  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  @Expose()
  @Transform(fromAlias("client_id"))
  @IsUUID()
  clientId: string;

  @ApiProperty({
    minLength: CLIENT_SECRET_MIN_LENGTH,
    maxLength: CLIENT_SECRET_MAX_LENGTH,
    example: "s3cr3t-client-p@ss",
  })
  @Expose()
  @Transform(fromAlias("client_secret"))
  @IsString()
  @Length(CLIENT_SECRET_MIN_LENGTH, CLIENT_SECRET_MAX_LENGTH)
  clientSecret: string;

  @ApiPropertyOptional({ maxLength: RAW_CODE_MAX_LENGTH, example: "3Nc9XpQaB7vFk2mZr8Tq1wLd5yHn0JcVe6SbA2RfUiM" })
  @ValidateIf((request: TokenRequest) => request.grantType === GRANT_TYPE_AUTHORIZATION_CODE)
  @IsString()
  @Length(1, RAW_CODE_MAX_LENGTH)
  code?: string;

  @ApiPropertyOptional({ description: "Required for grantType=refresh_token" })
  @Expose()
  @Transform(fromAlias("refresh_token"))
  @ValidateIf((request: TokenRequest) => request.grantType === GRANT_TYPE_REFRESH_TOKEN)
  @IsString()
  @Length(1, 255)
  refreshToken?: string;

  @ApiPropertyOptional({
    maxLength: REDIRECT_URI_MAX_LENGTH,
    example: "https://pet-dashboard.example.com/auth/callback",
    pattern: REDIRECT_URI_PATTERN.source,
    description: "Must be equal to the redirect uri the code was issued for",
  })
  @Expose()
  @Transform(fromAlias("redirect_uri"))
  @IsOptional()
  @IsString()
  @Length(1, REDIRECT_URI_MAX_LENGTH)
  @Matches(REDIRECT_URI_PATTERN)
  redirectUri?: string;

  @Allow()
  grant_type?: unknown;

  @Allow()
  client_id?: unknown;

  @Allow()
  client_secret?: unknown;

  @Allow()
  refresh_token?: unknown;

  @Allow()
  redirect_uri?: unknown;
}
