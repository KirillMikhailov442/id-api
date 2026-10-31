import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

import { EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "@modules/user/domain/value-object/email.value-object";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "@modules/user/domain/value-object/name.value-object";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from "@modules/user/domain/value-object/password.value-object";
import { SURNAME_MAX_LENGTH, SURNAME_MIN_LENGTH } from "@modules/user/domain/value-object/surname.value-object";

export class CreateUserRequest {
  @ApiProperty({ minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH, example: "Ivan" })
  @IsString()
  @MinLength(NAME_MIN_LENGTH)
  @MaxLength(NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({ minLength: SURNAME_MIN_LENGTH, maxLength: SURNAME_MAX_LENGTH, example: "Ivanov" })
  @IsString()
  @MinLength(SURNAME_MIN_LENGTH)
  @MaxLength(SURNAME_MAX_LENGTH)
  surname: string;

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
