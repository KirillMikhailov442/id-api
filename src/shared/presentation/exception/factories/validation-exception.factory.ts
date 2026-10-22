import { HttpException, type ValidationError } from "@nestjs/common";
import { FieldError } from "@shared/presentation/exception/field-error";
import { HttpStatus } from "@shared/presentation/exception/http-status.enum";

export function validationExceptionFactory(errors: ValidationError[]): HttpException {
  const fieldErrors = errors.map(
    (error) => new FieldError(error.property, Object.values(error.constraints ?? {}).join("; "))
  );
  return new HttpException({ message: "Validation failed", errors: fieldErrors }, HttpStatus.Validation);
}
