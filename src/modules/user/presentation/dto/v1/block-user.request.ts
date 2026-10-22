import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

const REASON_MAX_LENGTH = 500;

export class BlockUserRequest {
  @ApiPropertyOptional({ description: "Reason for blocking, sent to the user by email", maxLength: REASON_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(REASON_MAX_LENGTH)
  reason?: string;
}
