import { ApiProperty } from "@nestjs/swagger";

export class FieldError {
  @ApiProperty({ example: "email" })
  field: string;

  @ApiProperty({ example: "email must be a valid email address" })
  message: string;

  constructor(field: string, message: string) {
    this.field = field;
    this.message = message;
  }
}
