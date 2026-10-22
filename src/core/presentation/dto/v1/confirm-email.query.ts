import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ConfirmEmailQuery {
  @ApiProperty({ description: "Email confirmation token from the email link", minLength: 1 })
  @IsString()
  @MinLength(1)
  token: string;
}
