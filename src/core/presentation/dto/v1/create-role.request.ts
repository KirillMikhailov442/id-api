import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

import { RoleType } from "@core/domain/enum/role-type.enum";

export class CreateRoleRequest {
  @ApiProperty({ enum: RoleType, example: RoleType.Admin })
  @IsEnum(RoleType)
  name: RoleType;
}
