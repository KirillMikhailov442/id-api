import { HttpStatus } from "@shared/domain/http-status.enum";
import type { FieldError } from "@shared/presentation/exception/field-error";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";

export class ValidationExceptionResponse extends ExceptionResponse {
  constructor(errors: FieldError[], path: string, timestamp: string, message = "Validation failed") {
    super(HttpStatus.Validation, "VALIDATION_FAILED", message, path, timestamp, errors);
  }
}
