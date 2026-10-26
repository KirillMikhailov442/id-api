import { ApiProperty } from "@nestjs/swagger";
import { RoleType } from "@modules/user/domain/enum/role-type.enum";
import { IsEnum } from "class-validator";

export class CreateRoleRequest {
  @ApiProperty({ enum: RoleType, example: RoleType.Admin })
  @IsEnum(RoleType)
  name: RoleType;
}
