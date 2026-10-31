import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { HttpStatus } from "@shared/http/http-status.enum";
import { EXAMPLE_TIMESTAMP } from "@shared/exception/swagger/response-example";
import { ExceptionResponse } from "@shared/exception/response/exception.response";

export const ApiInvalidCredentialsResponse = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description: "Email or password is incorrect",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Unauthorized,
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
        path: "/v1/auth/login",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiUserBlockedResponse = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: "User account is blocked",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Forbidden,
        code: "USER_BLOCKED",
        message: "User is blocked",
        path: "/v1/auth/login",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiInvalidRefreshTokenResponse = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description: "Refresh token cookie is missing, unknown or revoked",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Unauthorized,
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
        path: "/v1/auth/logout",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiAuthenticatedResponse = () =>
  applyDecorators(ApiBearerAuth(), ApiInvalidAccessTokenResponse(), ApiAccessTokenExpiredResponse());

export const ApiInvalidAccessTokenResponse = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description: "Access token is missing or invalid",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Unauthorized,
        code: "INVALID_ACCESS_TOKEN",
        message: "Invalid access token",
        path: "/v1/users",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiAccessTokenExpiredResponse = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description: "Access token has expired",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Unauthorized,
        code: "ACCESS_TOKEN_EXPIRED",
        message: "Access token expired",
        path: "/v1/users",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiInsufficientRoleResponse = () =>
  applyDecorators(
    ApiForbiddenResponse({
      description: "User does not have the required role",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Forbidden,
        code: "INSUFFICIENT_ROLE",
        message: "Insufficient role",
        path: "/v1/roles",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiInvalidSessionIdResponse = () =>
  applyDecorators(
    ApiBadRequestResponse({
      description: "Session identifier is not a valid UUID",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.BadRequest,
        code: "BAD_REQUEST",
        message: "Validation failed (uuid is expected)",
        path: "/v1/users/me/sessions/invalid-id",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );

export const ApiSessionNotFoundResponse = () =>
  applyDecorators(
    ApiNotFoundResponse({
      description: "Session does not exist or belongs to another user",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.NotFound,
        code: "SESSION_NOT_FOUND",
        message: "Session not found",
        path: "/v1/users/me/sessions/9e20f958-86cb-4a71-a53a-dab1b026c739",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );
