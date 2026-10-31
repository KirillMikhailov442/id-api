import { ApiProperty } from "@nestjs/swagger";
import { IsDifferentFrom } from "@shared/validation/is-different-from.decorator";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from "@modules/user/domain/value-object/password.value-object";

export class ChangePasswordRequest {
  @ApiProperty({ format: "password", minLength: 1, example: "OldS3cureP@ssw0rd" })
  @IsString()
  @MinLength(1)
  oldPassword: string;

  @ApiProperty({
    format: "password",
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    pattern: PASSWORD_PATTERN.source,
    description: `${PASSWORD_REQUIREMENTS_MESSAGE}. Must be different from oldPassword`,
    example: "NewS3cureP@ssw0rd",
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  @IsDifferentFrom("oldPassword")
  newPassword: string;
}
