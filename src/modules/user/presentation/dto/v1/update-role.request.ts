import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

import { RoleType } from "@modules/user/domain/enum/role-type.enum";

export class UpdateRoleRequest {
  @ApiProperty({ enum: RoleType, example: RoleType.Admin })
  @IsEnum(RoleType)
  name: RoleType;
}
