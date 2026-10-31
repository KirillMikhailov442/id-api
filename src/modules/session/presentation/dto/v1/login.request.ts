import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

import { EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "@modules/user/domain/value-object/email.value-object";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from "@modules/user/domain/value-object/password.value-object";

export class LoginRequest {
  @ApiProperty({ format: "email", maxLength: EMAIL_MAX_LENGTH, example: "ivan.ivanov@example.com" })
  @IsString()
  @MaxLength(EMAIL_MAX_LENGTH)
  @Matches(EMAIL_PATTERN)
  email: string;

  @ApiProperty({
    format: "password",
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    pattern: PASSWORD_PATTERN.source,
    description: PASSWORD_REQUIREMENTS_MESSAGE,
    example: "S3cureP@ssw0rd",
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password: string;
}
