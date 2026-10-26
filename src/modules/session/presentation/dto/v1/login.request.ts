import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

import { PASSWORD_MAX_LENGTH } from "@modules/user/domain/entity/user";
import { MAX_LENGTH as EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "@modules/user/domain/value-object/email.value-object";

export class LoginRequest {
  @ApiProperty({ format: "email", maxLength: EMAIL_MAX_LENGTH, example: "ivan.ivanov@example.com" })
  @IsString()
  @MaxLength(EMAIL_MAX_LENGTH)
  @Matches(EMAIL_PATTERN)
  email: string;
  @ApiProperty({ minLength: 1, maxLength: PASSWORD_MAX_LENGTH, example: "S3cureP@ssw0rd" })
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
