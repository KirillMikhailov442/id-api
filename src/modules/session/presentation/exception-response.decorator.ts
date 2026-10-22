import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { HttpStatus } from "@shared/presentation/exception/http-status.enum";
import { EXAMPLE_TIMESTAMP } from "@shared/presentation/exception/response-example";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";

export const ApiInvalidCredentialsResponse = () =>
  applyDecorators(
    ApiUnauthorizedResponse({
      description: "Email or password is incorrect",
      type: ExceptionResponse,
      example: {
        status: HttpStatus.Unauthorized,
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
        message: "Insufficient role",
        path: "/v1/roles",
        timestamp: EXAMPLE_TIMESTAMP,
      },
    })
  );
