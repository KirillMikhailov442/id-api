import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { HttpStatus } from "@shared/http/http-status.enum";
import { ApiValidationFailedResponse as ApiValidationFailedResponseFactory } from "@shared/exception/swagger/api-validation-failed-response";
import type { FieldError } from "@shared/exception/response/field-error";
import { EXAMPLE_TIMESTAMP } from "@shared/exception/swagger/response-example";
import { ExceptionResponse } from "@shared/exception/response/exception.response";

const EXAMPLE_USER_ID = "00000000-0000-4000-8000-000000000000";

export const ApiInvalidOldPasswordResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Old password is incorrect",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.BadRequest,
        code: "INVALID_OLD_PASSWORD",
        message: "Old password is incorrect",
        path: "/users/me/password",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiChangePasswordValidationFailedResponse = () =>
  ApiValidationFailedResponseFactory(
    [
      { field: "oldPassword", code: "TOO_SHORT", message: "oldPassword must be longer than or equal to 1 characters" },
      { field: "newPassword", code: "TOO_LONG", message: "newPassword must be shorter than or equal to 72 characters" },
    ],
    "/users/me/password"
  );

const CREATE_FIELD_ERRORS: FieldError[] = [
  { field: "name", code: "TOO_SHORT", message: "name must be longer than or equal to 2 characters" },
  {
    field: "email",
    code: "INVALID_EMAIL",
    message: "email must match /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ regular expression",
  },
  { field: "password", code: "TOO_LONG", message: "password must be shorter than or equal to 72 characters" },
];

const UPDATE_FIELD_ERRORS: FieldError[] = [
  { field: "name", code: "TOO_SHORT", message: "name must be longer than or equal to 2 characters" },
  {
    field: "email",
    code: "INVALID_EMAIL",
    message: "email must match /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ regular expression",
  },
];

const PAGINATION_FIELD_ERRORS: FieldError[] = [
  { field: "limit", code: "TOO_LARGE", message: "limit must not be greater than 100" },
  { field: "offset", code: "TOO_SMALL", message: "offset must not be less than 0" },
];

export const ApiUserNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "User does not exist",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.NotFound,
        code: "USER_NOT_FOUND",
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
        code: "BAD_REQUEST",
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
        code: "EMAIL_ALREADY_REGISTERED",
        message: "Email already registered",
        path: "/users",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiEmailAlreadyConfirmedResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Email is already confirmed",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Conflict,
        code: "EMAIL_ALREADY_CONFIRMED",
        message: "Email is already confirmed",
        path: "/users/confirm-email",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiInvalidEmailConfirmationTokenResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Email confirmation token is invalid or expired",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.BadRequest,
        code: "INVALID_EMAIL_CONFIRMATION_TOKEN",
        message: "Email confirmation token is invalid or expired",
        path: "/users/confirm-email",
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
        code: "USER_ALREADY_BLOCKED",
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
        code: "USER_ALREADY_UNBLOCKED",
        message: "User already unblocked",
        path: `/users/${EXAMPLE_USER_ID}/unblock`,
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiValidationFailedResponse = (fieldErrors: FieldError[]) =>
  ApiValidationFailedResponseFactory(fieldErrors, "/users");

export const ApiUnexpectedErrorResponse = () =>
  applyDecorators(
    ApiInternalServerErrorResponse({
      description: "Unexpected server error",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.InternalServerError,
        code: "INTERNAL_SERVER_ERROR",
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
        code: "BAD_REQUEST",
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
        code: "ROLE_NOT_FOUND",
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
        code: "ROLE_ALREADY_EXISTS",
        message: "Role already exists",
        path: "/roles",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiRoleValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    { field: "name", code: "INVALID_VALUE", message: "name must be one of the following values: USER, ADMIN" },
  ]);

export const ApiRoleCreateValidationFailedResponse = () => ApiRoleValidationFailedResponse();

export const ApiRoleUpdateValidationFailedResponse = () => ApiRoleValidationFailedResponse();

export const ApiCreateValidationFailedResponse = () => ApiValidationFailedResponse(CREATE_FIELD_ERRORS);

export const ApiUpdateValidationFailedResponse = () => ApiValidationFailedResponse(UPDATE_FIELD_ERRORS);

export const ApiPaginationValidationFailedResponse = () => ApiValidationFailedResponse(PAGINATION_FIELD_ERRORS);
