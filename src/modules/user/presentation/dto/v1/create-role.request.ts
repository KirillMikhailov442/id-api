import { ApiProperty } from "@nestjs/swagger";
import { RoleType } from "@shared/domain/role-type.enum";
import { IsEnum } from "class-validator";

export class CreateRoleRequest {
  @ApiProperty({ enum: RoleType, example: RoleType.Admin })
  @IsEnum(RoleType)
  name: RoleType;
}
