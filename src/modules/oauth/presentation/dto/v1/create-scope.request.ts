import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";

import { OAuthScope } from "@modules/oauth/domain/enum/oauth-scope.enum";
import {
  SCOPE_NAME_MAX_LENGTH,
  SCOPE_NAME_MIN_LENGTH,
  SCOPE_NAME_PATTERN,
} from "@modules/oauth/domain/value-object/scope-name.value-object";

export class CreateScopeRequest {
  @ApiProperty({
    minLength: SCOPE_NAME_MIN_LENGTH,
    maxLength: SCOPE_NAME_MAX_LENGTH,
    example: OAuthScope.OpenId,
    pattern: SCOPE_NAME_PATTERN.source,
  })
  @IsString()
  @Length(SCOPE_NAME_MIN_LENGTH, SCOPE_NAME_MAX_LENGTH)
  @Matches(SCOPE_NAME_PATTERN)
  name: string;
}
