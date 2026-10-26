import { ApiProperty } from "@nestjs/swagger";

export class FieldError {
  @ApiProperty({ example: "email" })
  field: string;
  @ApiProperty({ example: "INVALID_EMAIL" })
  code: string;
  @ApiProperty({ example: "email must be a valid email address" })
  message: string;

  constructor(field: string, code: string, message: string) {
    this.field = field;
    this.code = code;
    this.message = message;
  }
}
