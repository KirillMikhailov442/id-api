import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { ApiPaginationResponse } from "@shared/pagination/pagination-response.decorator";
import { PaginationQuery } from "@shared/pagination/pagination.query";

import { OAuthGrantsController } from "@modules/oauth/presentation/controller/v1/oauth-grants.controller";
import { OAuthGrantDto } from "@modules/oauth/presentation/dto/v1/oauth-grant.dto";
import {
  ApiAuthenticatedResponse,
  ApiInsufficientRoleResponse,
} from "@modules/session/presentation/exception-response.decorator";
import {
  ApiInvalidUserIdResponse,
  ApiPaginationValidationFailedResponse,
  ApiUnexpectedErrorResponse,
  ApiUserNotFoundResponse,
} from "@modules/user/presentation/exception-response.decorator";

type OAuthGrantsControllerMethod = {
  [K in keyof OAuthGrantsController]: OAuthGrantsController[K] extends (...args: never[]) => unknown ? K : never;
}[keyof OAuthGrantsController];

export class OAuthGrantsControllerSwagger {
  static register(): void {
    ApiBearerAuth()(OAuthGrantsController);
    ApiTags("oauth")(OAuthGrantsController);

    this.documentMethod(
      "listOwn",
      ApiOperation({
        description:
          "Includes active, expired and revoked grants, newest first. Each authorization is listed separately.",
      }),
      ApiQuery({ type: PaginationQuery }),
      ApiPaginationResponse(OAuthGrantDto, "OAuth permissions granted by the current user"),
      ApiAuthenticatedResponse(),
      ApiPaginationValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "listUser",
      ApiOperation({
        description: "Requires an internal SSO access token with the ADMIN role.",
      }),
      ApiQuery({ type: PaginationQuery }),
      ApiPaginationResponse(OAuthGrantDto, "OAuth permissions granted by the specified user"),
      ApiAuthenticatedResponse(),
      ApiInsufficientRoleResponse(),
      ApiInvalidUserIdResponse(),
      ApiUserNotFoundResponse(),
      ApiPaginationValidationFailedResponse(),
      ApiUnexpectedErrorResponse()
    );

    this.documentMethod(
      "revokeOwn",
      ApiAuthenticatedResponse(),
      ApiNoContentResponse(),
      ApiNotFoundResponse({ description: "Grant not found or belongs to another user" })
    );

    this.documentMethod(
      "revokeUser",
      ApiOperation({
        description: "Requires an internal SSO access token with the ADMIN role.",
      }),
      ApiAuthenticatedResponse(),
      ApiInsufficientRoleResponse(),
      ApiNotFoundResponse({ description: "OAuth grant not found" }),
      ApiNoContentResponse()
    );
  }

  private static documentMethod(name: OAuthGrantsControllerMethod, ...decorators: MethodDecorator[]): void {
    const descriptor = Object.getOwnPropertyDescriptor(OAuthGrantsController.prototype, name);

    if (descriptor === undefined) {
      throw new Error(`OAuthGrantsController.${name} does not exist`);
    }

    for (const decorator of [...decorators].reverse()) {
      decorator(OAuthGrantsController.prototype, name, descriptor);
    }
  }
}
