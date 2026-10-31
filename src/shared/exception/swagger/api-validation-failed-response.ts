import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { ExceptionResponse } from "@shared/exception/response/exception.response";
import type { FieldError } from "@shared/exception/response/field-error";
import { HttpStatus } from "@shared/http/http-status.enum";

export const ApiValidationFailedResponse = (fieldErrors: FieldError[], path: string) =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.Validation,
      description: "Request failed validation",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Validation,
        code: "VALIDATION_FAILED",
        message: "Validation failed",
        path,
        timestamp: "2026-10-21T09:00:00.000Z",
        errors: fieldErrors,
      },
    })
  );
