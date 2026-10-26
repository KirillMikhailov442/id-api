import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { HttpStatus } from "@shared/domain/http-status.enum";
import type { FieldError } from "@shared/presentation/exception/field-error";
import { EXAMPLE_TIMESTAMP } from "@shared/presentation/exception/response-example";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";

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
        timestamp: EXAMPLE_TIMESTAMP,
        errors: fieldErrors,
      },
    })
  );
