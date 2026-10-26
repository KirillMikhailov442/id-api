import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

import { MAX_LENGTH as EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "@modules/user/domain/value-object/email.value-object";
import {
  MAX_LENGTH as NAME_MAX_LENGTH,
  MIN_LENGTH as NAME_MIN_LENGTH,
} from "@modules/user/domain/value-object/name.value-object";
import {
  MAX_LENGTH as SURNAME_MAX_LENGTH,
  MIN_LENGTH as SURNAME_MIN_LENGTH,
} from "@modules/user/domain/value-object/surname.value-object";

export class UpdateUserRequest {
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
}
