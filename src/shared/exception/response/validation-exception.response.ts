import { ExceptionResponse } from "@shared/exception/response/exception.response";
import type { FieldError } from "@shared/exception/response/field-error";
import { HttpStatus } from "@shared/http/http-status.enum";

export class ValidationExceptionResponse extends ExceptionResponse {
  constructor(errors: FieldError[], path: string, timestamp: string, message = "Validation failed") {
    super(HttpStatus.Validation, "VALIDATION_FAILED", message, path, timestamp, errors);
  }
}
