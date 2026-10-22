import { applyDecorators } from "@nestjs/common";
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { HttpStatus } from "@core/shared/presentation/exception/http-status.enum";
import { ExceptionResponse } from "@core/shared/presentation/exception/responses/exception.response";

const EXAMPLE_TIMESTAMP = "2026-10-21T09:00:00.000Z";

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
