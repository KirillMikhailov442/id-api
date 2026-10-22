import type { FieldError } from "@shared/presentation/exception/field-error";
import { HttpStatus } from "@shared/presentation/exception/http-status.enum";
import { EXAMPLE_TIMESTAMP } from "@shared/presentation/exception/response-example";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";
import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";

export const ApiValidationFailedResponse = (fieldErrors: FieldError[], path: string) =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.Validation,
      description: "Request failed validation",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Validation,
        message: "Validation failed",
        path,
        timestamp: EXAMPLE_TIMESTAMP,
        errors: fieldErrors,
      },
    })
  );
