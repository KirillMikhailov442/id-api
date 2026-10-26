import { ApiProperty } from "@nestjs/swagger";

import type { Role } from "@modules/user/domain/entity/role";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { MAX_LENGTH, MIN_LENGTH } from "@modules/user/domain/value-object/role-name.value-object";

export class RoleDto {
  @ApiProperty({ format: "uuid", example: "00000000-0000-4000-8000-000000000000" })
  id: string;
  @ApiProperty({ minLength: MIN_LENGTH, maxLength: MAX_LENGTH, enum: RoleType, example: RoleType.User })
  name: string;
  @ApiProperty({ format: "date-time", example: "2026-10-21T09:00:00.000Z" })
  createdAt: string;

  static fromDomain(role: Role): RoleDto {
    const dto = new RoleDto();

    dto.id = role.getId();
    dto.name = role.getName().getValue();
    dto.createdAt = role.getCreatedAt().toISOString();

    return dto;
  }
}
