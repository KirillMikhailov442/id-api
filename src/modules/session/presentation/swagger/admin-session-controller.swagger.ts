import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ApiPaginationResponse } from "@shared/pagination/pagination-response.decorator";

import { AdminSessionController } from "@modules/session/presentation/controller/v1/admin-session.controller";
import { AdminSessionDto } from "@modules/session/presentation/dto/v1/admin-session.dto";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
  ApiInvalidSessionIdResponse,
  ApiSessionNotFoundResponse,
} from "@modules/session/presentation/exception-response.decorator";
import {
  ApiInvalidUserIdResponse,
  ApiPaginationValidationFailedResponse,
  ApiUserNotFoundResponse,
} from "@modules/user/presentation/exception-response.decorator";

export function registerAdminSessionControllerSwagger(): void {
  ApiTags("sessions")(AdminSessionController);

  for (const name of ["list", "get", "revoke", "revokeAll"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(AdminSessionController.prototype, name);

    if (descriptor === undefined) {
      throw new Error(`AdminSessionController.${name} does not exist`);
    }

    const decorators = [
      ApiAuthenticatedResponse(),
      ApiOperation({ summary: "Requires admin role" }),
      ApiInsufficientRoleResponse(),
      ApiParam({ name: "userId", format: "uuid" }),
      ApiInvalidUserIdResponse(),
      ApiUserNotFoundResponse(),
      ...(name === "list"
        ? [
            ApiPaginationResponse(AdminSessionDto, "Paginated list of user sessions"),
            ApiPaginationValidationFailedResponse(),
            ApiQuery({
              name: "search",
              required: false,
              schema: { type: "string", maxLength: 255 },
              description:
                "Case-insensitive substring search by session ID, IP, browser, OS or device type. Whitespace is trimmed; empty search returns all retained sessions. Wildcards are literal.",
            }),
          ]
        : name === "get"
          ? [
              ApiOkResponse({
                type: AdminSessionDto,
                description: "Session found",
              }),
            ]
          : [
              ApiNoContentResponse({
                description:
                  name === "revoke"
                    ? "Session revoked, including access and refresh tokens; repeated requests also succeed"
                    : "All user sessions revoked, including access and refresh tokens; succeeds even when there are no sessions",
              }),
            ]),
      ...(name === "get" || name === "revoke"
        ? [ApiParam({ name: "sessionId", format: "uuid" }), ApiInvalidSessionIdResponse(), ApiSessionNotFoundResponse()]
        : []),
    ];

    for (const decorator of [...decorators].reverse()) {
      decorator(AdminSessionController.prototype, name, descriptor);
    }
  }
}
