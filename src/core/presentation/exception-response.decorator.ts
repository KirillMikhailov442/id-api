import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from "@nestjs/swagger";

import type { FieldError } from "@core/shared/presentation/exception/field-error";
import { HttpStatus } from "@core/shared/presentation/exception/http-status.enum";
import { ExceptionResponse } from "@core/shared/presentation/exception/responses/exception.response";

const EXAMPLE_TIMESTAMP = "2026-10-21T09:00:00.000Z";
const EXAMPLE_USER_ID = "00000000-0000-4000-8000-000000000000";

const CREATE_FIELD_ERRORS: FieldError[] = [
  { field: "name", message: "name must be longer than or equal to 2 characters" },
  { field: "email", message: "email must match /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ regular expression" },
  { field: "password", message: "password must be shorter than or equal to 72 characters" },
];

const UPDATE_FIELD_ERRORS: FieldError[] = [
  { field: "name", message: "name must be longer than or equal to 2 characters" },
  { field: "email", message: "email must match /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ regular expression" },
];

const PAGINATION_FIELD_ERRORS: FieldError[] = [
  { field: "limit", message: "limit must not be greater than 100" },
  { field: "offset", message: "offset must not be less than 0" },
];

export const ApiUserNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "User does not exist",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.NotFound,
        message: "User not found",
        path: `/users/${EXAMPLE_USER_ID}`,
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiInvalidUserIdResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "User identifier is not a valid uuid",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.BadRequest,
        message: "Validation failed (uuid is expected)",
        path: "/users/not-a-uuid",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiEmailAlreadyRegisteredResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Email is already taken by another user",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Conflict,
        message: "Email already registered",
        path: "/users",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiUserAlreadyBlockedResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "User is already blocked",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Conflict,
        message: "User already blocked",
        path: `/users/${EXAMPLE_USER_ID}/block`,
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiUserAlreadyUnblockedResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "User is not blocked",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Conflict,
        message: "User already unblocked",
        path: `/users/${EXAMPLE_USER_ID}/unblock`,
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiValidationFailedResponse = (fieldErrors: FieldError[]) =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.Validation,
      description: "Request failed validation",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Validation,
        message: "Validation failed",
        path: "/users",
        timestamp: EXAMPLE_TIMESTAMP,
        errors: fieldErrors,
      },
    })
  );

export const ApiUnexpectedErrorResponse = () =>
  applyDecorators(
    ApiInternalServerErrorResponse({
      description: "Unexpected server error",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.InternalServerError,
        message: "Internal server error",
        path: "/users",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiInvalidRoleIdResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Role identifier is not a valid uuid",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.BadRequest,
        message: "Validation failed (uuid is expected)",
        path: "/roles/not-a-uuid",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiRoleNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "Role does not exist",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.NotFound,
        message: "Role not found",
        path: `/roles/${EXAMPLE_USER_ID}`,
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiRoleAlreadyExistsResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Role name is already taken by another role",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Conflict,
        message: "Role already exists",
        path: "/roles",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiRoleValidationFailedResponse = () =>
  ApiValidationFailedResponse([{ field: "name", message: "name must be one of the following values: USER, ADMIN" }]);

export const ApiRoleCreateValidationFailedResponse = () => ApiRoleValidationFailedResponse();
export const ApiRoleUpdateValidationFailedResponse = () => ApiRoleValidationFailedResponse();

export const ApiCreateValidationFailedResponse = () => ApiValidationFailedResponse(CREATE_FIELD_ERRORS);
export const ApiUpdateValidationFailedResponse = () => ApiValidationFailedResponse(UPDATE_FIELD_ERRORS);
export const ApiPaginationValidationFailedResponse = () => ApiValidationFailedResponse(PAGINATION_FIELD_ERRORS);
