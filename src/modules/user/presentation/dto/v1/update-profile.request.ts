import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, Length, Matches, MaxLength, ValidateIf } from "class-validator";

import { EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "@modules/user/domain/value-object/email.value-object";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from "@modules/user/domain/value-object/name.value-object";
import { SURNAME_MAX_LENGTH, SURNAME_MIN_LENGTH } from "@modules/user/domain/value-object/surname.value-object";

export class UpdateProfileRequest {
  @ApiPropertyOptional({ minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(NAME_MIN_LENGTH, NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ minLength: SURNAME_MIN_LENGTH, maxLength: SURNAME_MAX_LENGTH })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(SURNAME_MIN_LENGTH, SURNAME_MAX_LENGTH)
  surname?: string;

  @ApiPropertyOptional({ format: "email", description: "Only internal SSO sessions may change email" })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(EMAIL_MAX_LENGTH)
  @Matches(EMAIL_PATTERN)
  email?: string;
}
