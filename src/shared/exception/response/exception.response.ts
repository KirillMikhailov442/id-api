import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FieldError } from "@shared/exception/response/field-error";

export class ExceptionResponse {
  @ApiProperty({ example: 404 })
  status: number;
  @ApiProperty({ example: "USER_NOT_FOUND" })
  code: string;
  @ApiProperty({ example: "User not found" })
  message: string;
  @ApiProperty({ example: "/users/00000000-0000-4000-8000-000000000000" })
  path: string;
  @ApiProperty({ format: "date-time", example: "2026-10-21T09:00:00.000Z" })
  timestamp: string;
  @ApiPropertyOptional({ type: [FieldError] })
  errors?: FieldError[];

  constructor(status: number, code: string, message: string, path: string, timestamp: string, errors?: FieldError[]) {
    this.status = status;
    this.code = code;
    this.message = message;
    this.path = path;
    this.timestamp = timestamp;
    this.errors = errors;
  }
}
