import { ApiProperty } from "@nestjs/swagger";

import type { Scope } from "@modules/oauth/domain/entity/scope";
import { OAuthScope } from "@modules/oauth/domain/enum/oauth-scope.enum";

const EXAMPLE_ID = "00000000-0000-4000-8000-000000000000";

export class ScopeDto {
  @ApiProperty({ format: "uuid", example: EXAMPLE_ID })
  id: string;

  @ApiProperty({ maxLength: 32, example: OAuthScope.OpenId })
  name: string;

  @ApiProperty({ format: "date-time", example: "2026-10-21T09:00:00.000Z" })
  createdAt: string;

  static fromDomain(scope: Scope): ScopeDto {
    const dto = new ScopeDto();

    dto.id = scope.getId().getValue();
    dto.name = scope.getName().getValue();
    dto.createdAt = scope.getCreatedAt().toISOString();

    return dto;
  }
}
