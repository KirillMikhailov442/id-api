import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

import {
  MAX_LENGTH as SCOPE_NAME_MAX_LENGTH,
  MIN_LENGTH as SCOPE_NAME_MIN_LENGTH,
  SCOPE_NAME_PATTERN,
} from "@modules/oauth/domain/value-object/scope-name.value-object";

export class CreateScopeRequest {
  @ApiProperty({
    minLength: SCOPE_NAME_MIN_LENGTH,
    maxLength: SCOPE_NAME_MAX_LENGTH,
    example: "openid",
    pattern: SCOPE_NAME_PATTERN.source,
  })
  @IsString()
  @Length(SCOPE_NAME_MIN_LENGTH, SCOPE_NAME_MAX_LENGTH)
  @Matches(SCOPE_NAME_PATTERN)
  name: string;
}
