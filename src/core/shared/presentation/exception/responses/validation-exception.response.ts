import type { FieldError } from "@core/shared/presentation/exception/field-error";
import { HttpStatus } from "@core/shared/presentation/exception/http-status.enum";
import { ExceptionResponse } from "@core/shared/presentation/exception/responses/exception.response";

export class ValidationExceptionResponse extends ExceptionResponse {
  constructor(errors: FieldError[], path: string, timestamp: string, message = "Validation failed") {
    super(HttpStatus.Validation, message, path, timestamp, errors);
  }
}
