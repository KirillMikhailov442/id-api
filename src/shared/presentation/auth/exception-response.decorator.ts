import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { HttpStatus } from "@shared/presentation/exception/http-status.enum";
import { ExceptionResponse } from "@shared/presentation/exception/responses/exception.response";

const EXAMPLE_TIMESTAMP = "2026-10-21T09:00:00.000Z";

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
