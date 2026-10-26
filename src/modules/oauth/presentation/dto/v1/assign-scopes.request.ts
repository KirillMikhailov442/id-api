import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString, Length, Matches } from "class-validator";

import {
  MAX_LENGTH as SCOPE_NAME_MAX_LENGTH,
  MIN_LENGTH as SCOPE_NAME_MIN_LENGTH,
  SCOPE_NAME_PATTERN,
} from "@modules/oauth/domain/value-object/scope-name.value-object";

const MAX_SCOPES_PER_REQUEST = 50;

export class AssignScopesRequest {
  @ApiProperty({
    type: [String],
    maxItems: MAX_SCOPES_PER_REQUEST,
    example: ["openid", "profile"],
    description: "Full set of scopes assigned to the client",
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_SCOPES_PER_REQUEST)
  @IsString({ each: true })
  @Length(SCOPE_NAME_MIN_LENGTH, SCOPE_NAME_MAX_LENGTH, { each: true })
  @Matches(SCOPE_NAME_PATTERN, { each: true })
  scopes: string[];
}
