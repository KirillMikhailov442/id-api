import { HttpException, type ValidationError } from "@nestjs/common";
import { HttpStatus } from "@shared/http/http-status.enum";
import { FieldError } from "@shared/exception/response/field-error";

const CONSTRAINT_CODES: Record<string, string> = {
  isNotEmpty: "REQUIRED",
  isDefined: "REQUIRED",
  isEmail: "INVALID_EMAIL",
  isUUID: "INVALID_UUID",
  isString: "NOT_A_STRING",
  isNumber: "NOT_A_NUMBER",
  isInt: "NOT_AN_INTEGER",
  isBoolean: "NOT_A_BOOLEAN",
  isDateString: "INVALID_DATE",
  isEnum: "INVALID_VALUE",
  isIn: "INVALID_VALUE",
  minLength: "TOO_SHORT",
  maxLength: "TOO_LONG",
  length: "INVALID_LENGTH",
  min: "TOO_SMALL",
  max: "TOO_LARGE",
  arrayMaxSize: "TOO_MANY_ITEMS",
  arrayMinSize: "TOO_FEW_ITEMS",
  matches: "INVALID_FORMAT",
};

const fieldErrorCode = (error: ValidationError): string => {
  const constraint = Object.keys(error.constraints ?? {})[0];

  if (constraint === undefined) {
    return "VALIDATION_FAILED";
  }

  return CONSTRAINT_CODES[constraint] ?? constraint.toUpperCase();
};

export function validationExceptionFactory(errors: ValidationError[]): HttpException {
  const fieldErrors = errors.map(
    (error) => new FieldError(error.property, fieldErrorCode(error), Object.values(error.constraints ?? {}).join("; "))
  );
  return new HttpException({ message: "Validation failed", errors: fieldErrors }, HttpStatus.Validation);
}
