import { HttpStatus } from "@shared/http/http-status.enum";
import type { FieldError } from "@shared/exception/response/field-error";
import { ExceptionResponse } from "@shared/exception/response/exception.response";

export class ValidationExceptionResponse extends ExceptionResponse {
  constructor(errors: FieldError[], path: string, timestamp: string, message = "Validation failed") {
    super(HttpStatus.Validation, "VALIDATION_FAILED", message, path, timestamp, errors);
  }
}
