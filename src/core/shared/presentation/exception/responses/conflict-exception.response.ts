import type { FieldError } from "@core/shared/presentation/exception/field-error";
import { HttpStatus } from "@core/shared/presentation/exception/http-status.enum";
import { ExceptionResponse } from "@core/shared/presentation/exception/responses/exception.response";

export class ConflictExceptionResponse extends ExceptionResponse {
  constructor(message: string, path: string, timestamp: string, errors?: FieldError[]) {
    super(HttpStatus.Conflict, message, path, timestamp, errors);
  }
}
