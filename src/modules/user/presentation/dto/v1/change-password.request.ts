import { ApiProperty } from "@nestjs/swagger";
import { IsByteLength, IsString, MaxLength, MinLength } from "class-validator";

import { PASSWORD_MAX_LENGTH } from "@modules/user/domain/entity/user";

export class ChangePasswordRequest {
  @ApiProperty({ format: "password", minLength: 1, maxLength: PASSWORD_MAX_LENGTH, example: "OldS3cureP@ssw0rd" })
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  oldPassword: string;
  @ApiProperty({
    format: "password",
    minLength: 1,
    maxLength: PASSWORD_MAX_LENGTH,
    description: "New password, at most 72 UTF-8 bytes",
    example: "NewS3cureP@ssw0rd",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @IsByteLength(1, PASSWORD_MAX_LENGTH)
  newPassword: string;
}
