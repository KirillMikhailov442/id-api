import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { HttpStatus } from "@shared/domain/http-status.enum";
import { ApiValidationFailedResponse as ApiValidationFailedResponseFactory } from "@shared/presentation/exception/api-validation-failed-response";
import type { FieldError } from "@shared/presentation/exception/field-error";
import { EXAMPLE_TIMESTAMP, responseExample } from "@shared/presentation/exception/response-example";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";

const EXAMPLE_CLIENT_ID = "00000000-0000-4000-8000-000000000000";

export const ApiClientNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "Client does not exist or belongs to another user",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.NotFound,
        "CLIENT_NOT_FOUND",
        "Client not found",
        `/clients/${EXAMPLE_CLIENT_ID}`
      ),
    })
  );

export const ApiClientAccessDeniedResponse = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: "Only admins may create clients on behalf of another user",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.Forbidden, "access_denied", "Access to the client is denied", "/clients"),
    })
  );

export const ApiClientAlreadyActiveResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Client is already active",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Conflict,
        "CLIENT_ALREADY_ACTIVE",
        "Client is already active",
        `/clients/${EXAMPLE_CLIENT_ID}`
      ),
    })
  );

export const ApiClientAlreadyInactiveResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Client is already inactive",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Conflict,
        "CLIENT_ALREADY_INACTIVE",
        "Client is already inactive",
        `/clients/${EXAMPLE_CLIENT_ID}`
      ),
    })
  );

export const ApiScopeNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "Scope does not exist",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.NotFound,
        "SCOPE_NOT_FOUND",
        'Scope "profile" not found',
        `/clients/${EXAMPLE_CLIENT_ID}/scopes`
      ),
    })
  );

export const ApiScopeAlreadyExistsResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Scope name is already taken by another scope",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.Conflict, "SCOPE_ALREADY_EXISTS", "Scope already exists", "/scopes"),
    })
  );

export const ApiScopeAlreadyAssignedResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Scope is already assigned to the client",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Conflict,
        "SCOPE_ALREADY_ASSIGNED",
        "Scope is already assigned to the client",
        `/clients/${EXAMPLE_CLIENT_ID}/scopes`
      ),
    })
  );

export const ApiScopeNotAssignedResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Scope is not assigned to the client",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Conflict,
        "SCOPE_NOT_ASSIGNED",
        "Scope is not assigned to the client",
        `/clients/${EXAMPLE_CLIENT_ID}/scopes`
      ),
    })
  );

export const ApiClientCreateValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    { field: "name", code: "TOO_SHORT", message: "name must be longer than or equal to 2 characters" },
    { field: "secret", code: "TOO_SHORT", message: "secret must be longer than or equal to 12 characters" },
    { field: "location", code: "INVALID_FORMAT", message: "location must be a valid absolute URI" },
  ]);

export const ApiClientUpdateValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    { field: "location", code: "INVALID_FORMAT", message: "location must be a valid absolute URI" },
    { field: "name", code: "TOO_SHORT", message: "name must be longer than or equal to 2 characters" },
  ]);

export const ApiScopesValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    {
      field: "scopes",
      code: "INVALID_FORMAT",
      message: "each value in scopes must match /^[a-zA-Z0-9:_.-]+$/ regular expression",
    },
  ]);

export const ApiScopeCreateValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    { field: "name", code: "INVALID_FORMAT", message: "name must match /^[a-zA-Z0-9:_.-]+$/ regular expression" },
  ]);

export const ApiClientInactiveResponse = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: "Client is inactive",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Forbidden,
        "unauthorized_client",
        "Client is inactive",
        `/clients/${EXAMPLE_CLIENT_ID}/codes`
      ),
    })
  );

export const ApiInvalidAuthorizationCodeResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Authorization code is invalid or does not belong to the client",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.BadRequest,
        "invalid_grant",
        "Authorization code is invalid",
        `/clients/${EXAMPLE_CLIENT_ID}/codes/redeem`
      ),
    })
  );

export const ApiAuthorizationCodeExpiredResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Authorization code is expired",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.BadRequest,
        "invalid_grant",
        "Authorization code is expired",
        `/clients/${EXAMPLE_CLIENT_ID}/codes/redeem`
      ),
    })
  );

export const ApiAuthorizationCodeAlreadyUsedResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Authorization code has already been used",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Conflict,
        "invalid_grant",
        "Authorization code has already been used",
        `/clients/${EXAMPLE_CLIENT_ID}/codes/redeem`
      ),
    })
  );

export const ApiAuthorizationScopesNotAllowedResponse = () =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.Validation,
      description: "Requested scopes are not assigned to the client",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Validation,
        code: "VALIDATION_FAILED",
        message: "Validation failed",
        path: `/clients/${EXAMPLE_CLIENT_ID}/codes`,
        timestamp: EXAMPLE_TIMESTAMP,
        errors: [
          { field: "scopes", code: "invalid_scope", message: "Requested scopes are not assigned to the client" },
        ],
      },
    })
  );

export const ApiRedirectUriNotAllowedResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Redirect uri is not registered for the client",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.BadRequest,
        "invalid_request",
        "Redirect uri is not registered for the client",
        `/clients/${EXAMPLE_CLIENT_ID}/codes`
      ),
    })
  );

export const ApiInvalidClientCredentialsResponse = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description: "Client secret is invalid",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Unauthorized,
        "invalid_client",
        "Client credentials are invalid",
        `/clients/${EXAMPLE_CLIENT_ID}/codes/redeem`
      ),
    })
  );

export const ApiValidationFailedResponse = (fieldErrors: FieldError[]) =>
  ApiValidationFailedResponseFactory(fieldErrors, "/clients");

export const ApiInvalidClientIdResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Client identifier is not a valid uuid",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.BadRequest,
        "BAD_REQUEST",
        "Validation failed (uuid is expected)",
        "/clients/not-a-uuid"
      ),
    })
  );
