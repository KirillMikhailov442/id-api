import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import type { FieldError } from "@shared/presentation/exception/field-error";
import { HttpStatus } from "@shared/presentation/exception/http-status.enum";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";

const EXAMPLE_TIMESTAMP = "2026-10-21T09:00:00.000Z";
const EXAMPLE_CLIENT_ID = "00000000-0000-4000-8000-000000000000";
const EXAMPLE_LOCATION_ID = "00000000-0000-4000-8000-000000000001";

const responseExample = (status: number, message: string, path: string) => ({
  status,
  message,
  path,
  timestamp: EXAMPLE_TIMESTAMP,
});

export const ApiClientNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "Client does not exist or belongs to another user",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.NotFound, "Client not found", `/clients/${EXAMPLE_CLIENT_ID}`),
    })
  );

export const ApiClientAccessDeniedResponse = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: "Only admins may create clients on behalf of another user",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.Forbidden, "Access to the client is denied", "/clients"),
    })
  );

export const ApiClientAlreadyActiveResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Client is already active",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.Conflict, "Client is already active", `/clients/${EXAMPLE_CLIENT_ID}`),
    })
  );

export const ApiClientAlreadyInactiveResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Client is already inactive",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.Conflict, "Client is already inactive", `/clients/${EXAMPLE_CLIENT_ID}`),
    })
  );

export const ApiLocationNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "Location does not exist or belongs to another client",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.NotFound,
        "Location not found",
        `/clients/${EXAMPLE_CLIENT_ID}/locations/${EXAMPLE_LOCATION_ID}`
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
      example: responseExample(HttpStatus.Conflict, "Scope already exists", "/scopes"),
    })
  );

export const ApiScopeAlreadyAssignedResponse = () =>
  applyDecorators(
    ApiConflictResponse({
      description: "Scope is already assigned to the client",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.Conflict,
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
        "Scope is not assigned to the client",
        `/clients/${EXAMPLE_CLIENT_ID}/scopes`
      ),
    })
  );

export const ApiClientCreateValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    { field: "name", message: "name must be longer than or equal to 2 characters" },
    { field: "secret", message: "secret must be longer than or equal to 12 characters" },
    { field: "locations", message: "locations must contain no more than 3 elements" },
  ]);

export const ApiClientUpdateValidationFailedResponse = () =>
  ApiValidationFailedResponse([{ field: "name", message: "name must be longer than or equal to 2 characters" }]);

export const ApiLocationValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    { field: "href", message: "href must match /^[a-zA-Z][a-zA-Z0-9+.-]*:\\S+$/ regular expression" },
  ]);

export const ApiScopesValidationFailedResponse = () =>
  ApiValidationFailedResponse([
    { field: "scopes", message: "each value in scopes must match /^[a-zA-Z0-9:_.-]+$/ regular expression" },
  ]);

export const ApiScopeCreateValidationFailedResponse = () =>
  ApiValidationFailedResponse([{ field: "name", message: "name must match /^[a-zA-Z0-9:_.-]+$/ regular expression" }]);

export const ApiClientInactiveResponse = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: "Client is inactive",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.Forbidden, "Client is inactive", `/clients/${EXAMPLE_CLIENT_ID}/codes`),
    })
  );

export const ApiInvalidAuthorizationCodeResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Authorization code is invalid or does not belong to the client",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.BadRequest,
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
        message: "Requested scopes are not assigned to the client",
        path: `/clients/${EXAMPLE_CLIENT_ID}/codes`,
        timestamp: EXAMPLE_TIMESTAMP,
        errors: [{ field: "scopes", message: "Requested scopes are not assigned to the client" }],
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
        "Client credentials are invalid",
        `/clients/${EXAMPLE_CLIENT_ID}/codes/redeem`
      ),
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
        path: "/clients",
        timestamp: EXAMPLE_TIMESTAMP,
        errors: fieldErrors,
      },
    })
  );

export const ApiInvalidClientIdResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Client identifier is not a valid uuid",
      type: ExceptionResponse,
      example: responseExample(HttpStatus.BadRequest, "Validation failed (uuid is expected)", "/clients/not-a-uuid"),
    })
  );

export const ApiInvalidLocationIdResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Location identifier is not a valid uuid",
      type: ExceptionResponse,
      example: responseExample(
        HttpStatus.BadRequest,
        "Validation failed (uuid is expected)",
        `/clients/${EXAMPLE_CLIENT_ID}/locations/not-a-uuid`
      ),
    })
  );
